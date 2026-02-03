import { ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { hapticImpact } from '../../hooks/useHaptics';
import { useSpringAnimation } from '../../hooks/useSpringAnimation';
import '../../styles/side-drawer.css';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: number;
  side?: 'left' | 'right';
  enableSwipeClose?: boolean;
  disableSafeAreaBottom?: boolean;
}

const VELOCITY_THRESHOLD = 0.3;
const DISMISS_THRESHOLD = 0.3;

export default function SideDrawer({
  isOpen,
  onClose,
  children,
  title,
  width = 280,
  side = 'left',
  enableSwipeClose = true,
  disableSafeAreaBottom = false,
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const isRight = side === 'right';
  const hiddenTranslateX = isRight ? width : -width;
  const [translateX, setTranslateX] = useState(hiddenTranslateX);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const startX = useRef(0);
  const startY = useRef(0);
  const startTranslateX = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityX = useRef(0);
  const gestureAxis = useRef<'horizontal' | 'vertical' | null>(null);

  const handleAnimationUpdate = useCallback((value: number) => {
    setTranslateX(value);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const { animate: springAnimate, cancel, setCurrent } = useSpringAnimation(hiddenTranslateX, handleAnimationUpdate, {
    onComplete: handleAnimationComplete,
  });

  const animate = useCallback((target: number, initialVelocity?: number) => {
    setIsAnimating(true);
    springAnimate(target, initialVelocity);
  }, [springAnimate]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      setTranslateX(hiddenTranslateX);
      setCurrent(hiddenTranslateX);

      requestAnimationFrame(() => {
        setOverlayOpacity(1);
        animate(0);
        hapticImpact('light');
      });
    } else {
      setOverlayOpacity(0);
      animate(hiddenTranslateX, velocityX.current);

      const timeout = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);

      return () => clearTimeout(timeout);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, animate, setCurrent, hiddenTranslateX]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeClose) return;
    cancel();
    setIsAnimating(false);
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTranslateX.current = translateX;
    lastX.current = e.touches[0].clientX;
    lastTime.current = Date.now();
    gestureAxis.current = null;
    setIsDragging(false);
  }, [cancel, translateX, enableSwipeClose]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeClose) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startX.current;
    const deltaY = currentY - startY.current;

    if (!gestureAxis.current) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX < 6 && absY < 6) return;

      if (absY > absX * 1.2) {
        gestureAxis.current = 'vertical';
        return;
      }

      gestureAxis.current = 'horizontal';
      setIsDragging(true);
      lastX.current = currentX;
      lastTime.current = Date.now();
    }

    if (gestureAxis.current !== 'horizontal') return;

    const now = Date.now();
    const dt = now - lastTime.current;

    if (dt > 0) {
      velocityX.current = (currentX - lastX.current) / dt;
    }

    lastX.current = currentX;
    lastTime.current = now;

    const minTranslateX = isRight ? 0 : -width;
    const maxTranslateX = isRight ? width : 0;
    const newTranslateX = Math.min(maxTranslateX, Math.max(minTranslateX, startTranslateX.current + deltaX));
    setTranslateX(newTranslateX);
    setCurrent(newTranslateX);

    const progress = Math.abs(newTranslateX) / width;
    setOverlayOpacity(1 - progress * 0.5);
  }, [width, setCurrent, enableSwipeClose]);

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipeClose) return;
    if (gestureAxis.current !== 'horizontal') {
      gestureAxis.current = null;
      setIsDragging(false);
      return;
    }

    setIsDragging(false);

    const progress = Math.abs(translateX) / width;
    const isVelocityDismiss = isRight
      ? velocityX.current > VELOCITY_THRESHOLD
      : velocityX.current < -VELOCITY_THRESHOLD;
    const shouldClose = isVelocityDismiss || progress > DISMISS_THRESHOLD;

    if (shouldClose) {
      hapticImpact('light');
      onClose();
    } else {
      animate(0, velocityX.current * 1000);
    }

    velocityX.current = 0;
    gestureAxis.current = null;
  }, [translateX, width, animate, onClose, enableSwipeClose, isRight]);

  const handleOverlayClick = useCallback(() => {
    hapticImpact('light');
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const overlayClass = `side-drawer-overlay${isDragging ? '' : ' side-drawer-overlay--animated'}`;
  const drawerClass = `side-drawer${isRight ? ' side-drawer--right' : ''}`;
  const drawerPaddingBottom = disableSafeAreaBottom ? '0' : undefined;

  return createPortal(
    <>
      <div
        className={overlayClass}
        style={{ backgroundColor: `rgba(0, 0, 0, ${0.5 * overlayOpacity})` }}
        onClick={handleOverlayClick}
      />
      <div
        ref={drawerRef}
        className={drawerClass}
        style={{
          width,
          transform: `translateX(${translateX}px)`,
          transition: (isDragging || isAnimating) ? 'none' : undefined,
          paddingBottom: drawerPaddingBottom,
        }}
        onTouchStart={enableSwipeClose ? handleTouchStart : undefined}
        onTouchMove={enableSwipeClose ? handleTouchMove : undefined}
        onTouchEnd={enableSwipeClose ? handleTouchEnd : undefined}
      >
        {title && (
          <div className="side-drawer-header">
            <span className="side-drawer-title">{title}</span>
          </div>
        )}
        <div className="side-drawer-content">{children}</div>
      </div>
    </>,
    document.body
  );
}
