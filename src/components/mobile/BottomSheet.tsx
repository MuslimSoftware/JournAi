import { ReactNode, useEffect, useRef, useState, useCallback, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import '../../styles/bottom-sheet.css';

type SnapPoint = number | 'auto';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  snapPoints?: SnapPoint[];
  defaultSnapPoint?: number;
  enableSwipeToDismiss?: boolean;
  onSnapChange?: (index: number) => void;
}

const VELOCITY_THRESHOLD = 0.5;
const DISMISS_THRESHOLD = 0.3;

function useSpringAnimation(
  targetValue: number,
  onUpdate: (value: number) => void,
  options = { stiffness: 300, damping: 30 }
) {
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const currentRef = useRef(targetValue);

  const animate = useCallback((target: number, initialVelocity = 0) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    velocityRef.current = initialVelocity;
    const { stiffness, damping } = options;

    const step = () => {
      const current = currentRef.current;
      const velocity = velocityRef.current;

      const springForce = (target - current) * stiffness;
      const dampingForce = velocity * damping;
      const acceleration = springForce - dampingForce;

      const dt = 1 / 60;
      velocityRef.current += acceleration * dt;
      currentRef.current += velocityRef.current * dt;

      onUpdate(currentRef.current);

      const isSettled =
        Math.abs(target - currentRef.current) < 0.5 &&
        Math.abs(velocityRef.current) < 0.5;

      if (!isSettled) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = target;
        onUpdate(target);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [onUpdate, options]);

  const cancel = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const setCurrent = useCallback((value: number) => {
    currentRef.current = value;
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { animate, cancel, setCurrent, currentRef };
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  snapPoints = ['auto'],
  defaultSnapPoint = 0,
  enableSwipeToDismiss = true,
  onSnapChange,
}: BottomSheetProps) {
  const { theme } = useTheme();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(defaultSnapPoint);
  const [isVisible, setIsVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const startY = useRef(0);
  const startTranslateY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);
  const contentScrollTop = useRef(0);
  const isScrolling = useRef(false);

  const { animate, cancel, setCurrent } = useSpringAnimation(0, setTranslateY);

  const getSnapPointPixels = useCallback((snapPoint: SnapPoint): number => {
    if (snapPoint === 'auto') {
      return sheetHeight;
    }
    const windowHeight = window.innerHeight;
    return snapPoint * windowHeight;
  }, [sheetHeight]);

  const resolvedSnapPoints = snapPoints.map(getSnapPointPixels);

  const findNearestSnapPoint = useCallback((y: number, velocity: number): number => {
    const sortedPoints = [...resolvedSnapPoints].sort((a, b) => a - b);

    if (velocity > VELOCITY_THRESHOLD && enableSwipeToDismiss) {
      return -1;
    }
    if (velocity < -VELOCITY_THRESHOLD) {
      const currentIndex = sortedPoints.indexOf(
        sortedPoints.reduce((prev, curr) =>
          Math.abs(curr - (sheetHeight - y)) < Math.abs(prev - (sheetHeight - y)) ? curr : prev
        )
      );
      return Math.min(currentIndex + 1, sortedPoints.length - 1);
    }

    let nearestIndex = 0;
    let nearestDistance = Infinity;

    sortedPoints.forEach((point, index) => {
      const distance = Math.abs(sheetHeight - y - point);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (enableSwipeToDismiss && y > sheetHeight * DISMISS_THRESHOLD) {
      return -1;
    }

    return nearestIndex;
  }, [resolvedSnapPoints, sheetHeight, enableSwipeToDismiss]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        if (sheetRef.current) {
          const height = sheetRef.current.offsetHeight;
          setSheetHeight(height);
          setTranslateY(height);
          setCurrent(height);

          requestAnimationFrame(() => {
            setOverlayOpacity(1);
            animate(0);
            hapticImpact('light');
          });
        }
      });
    } else {
      setOverlayOpacity(0);
      animate(sheetHeight, velocityY.current);

      const timeout = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);

      return () => clearTimeout(timeout);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, animate, setCurrent, sheetHeight]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (contentRef.current) {
      contentScrollTop.current = contentRef.current.scrollTop;
      isScrolling.current = contentScrollTop.current > 0;
    }

    if (isScrolling.current) return;

    cancel();
    startY.current = e.touches[0].clientY;
    startTranslateY.current = translateY;
    lastY.current = e.touches[0].clientY;
    lastTime.current = Date.now();
    setIsDragging(true);
  }, [cancel, translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isScrolling.current && contentRef.current) {
      if (contentRef.current.scrollTop === 0) {
        const currentY = e.touches[0].clientY;
        if (currentY > startY.current) {
          isScrolling.current = false;
        }
      }
      if (isScrolling.current) return;
    }

    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    const now = Date.now();
    const dt = now - lastTime.current;

    if (dt > 0) {
      velocityY.current = (currentY - lastY.current) / dt;
    }

    lastY.current = currentY;
    lastTime.current = now;

    const newTranslateY = Math.max(0, startTranslateY.current + deltaY);
    setTranslateY(newTranslateY);
    setCurrent(newTranslateY);

    const progress = Math.min(newTranslateY / sheetHeight, 1);
    setOverlayOpacity(1 - progress * 0.5);
  }, [isDragging, sheetHeight, setCurrent]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const snapIndex = findNearestSnapPoint(translateY, velocityY.current * 1000);

    if (snapIndex === -1) {
      hapticImpact('light');
      onClose();
    } else {
      const targetTranslate = sheetHeight - resolvedSnapPoints[snapIndex];
      animate(Math.max(0, targetTranslate), velocityY.current * 1000);

      if (snapIndex !== currentSnapIndex) {
        hapticSelection();
        setCurrentSnapIndex(snapIndex);
        onSnapChange?.(snapIndex);
      }
    }

    velocityY.current = 0;
  }, [isDragging, translateY, findNearestSnapPoint, animate, onClose, sheetHeight, resolvedSnapPoints, currentSnapIndex, onSnapChange]);

  const handleOverlayClick = useCallback(() => {
    hapticImpact('light');
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: `rgba(0, 0, 0, ${0.5 * overlayOpacity})`,
    zIndex: 2000,
    transition: isDragging ? 'none' : 'background-color 0.3s ease',
  };

  const heightMap = {
    auto: '90dvh',
    half: '50dvh',
    full: 'calc(100dvh - var(--mobile-safe-area-top) - 20px)',
  };

  const sheetStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: heightMap[height],
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    zIndex: 2001,
    transform: `translateY(${translateY}px)`,
    transition: isDragging ? 'none' : undefined,
    paddingBottom: 'var(--mobile-safe-area-bottom)',
    willChange: 'transform',
  };

  const handleStyle: CSSProperties = {
    width: '36px',
    height: '5px',
    backgroundColor: theme.colors.border.primary,
    borderRadius: '2.5px',
    margin: '8px auto 4px',
    opacity: 0.6,
  };

  const handleAreaStyle: CSSProperties = {
    padding: '4px 0',
    cursor: 'grab',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px 12px',
    borderBottom: title ? `1px solid ${theme.colors.border.primary}` : 'none',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1.0625rem',
    fontWeight: 600,
    color: theme.colors.text.primary,
  };

  const contentStyle: CSSProperties = {
    padding: '16px',
    overflowY: 'auto',
    maxHeight: 'calc(90dvh - 80px)',
    WebkitOverflowScrolling: 'touch',
  };

  return createPortal(
    <>
      <div style={overlayStyle} onClick={handleOverlayClick} />
      <div
        ref={sheetRef}
        style={sheetStyle}
        className="bottom-sheet"
      >
        <div
          style={handleAreaStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={handleStyle} className="bottom-sheet-handle" />
        </div>
        {title && (
          <div style={headerStyle}>
            <span style={titleStyle}>{title}</span>
          </div>
        )}
        <div ref={contentRef} style={contentStyle}>{children}</div>
      </div>
    </>,
    document.body
  );
}
