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
}

const VELOCITY_THRESHOLD = 0.3;
const DISMISS_THRESHOLD = 0.3;

export default function SideDrawer({
  isOpen,
  onClose,
  children,
  title,
  width = 280,
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(-width);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const startX = useRef(0);
  const startTranslateX = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityX = useRef(0);

  const handleAnimationUpdate = useCallback((value: number) => {
    setTranslateX(value);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const { animate: springAnimate, cancel, setCurrent } = useSpringAnimation(-width, handleAnimationUpdate, {
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
      setTranslateX(-width);
      setCurrent(-width);

      requestAnimationFrame(() => {
        setOverlayOpacity(1);
        animate(0);
        hapticImpact('light');
      });
    } else {
      setOverlayOpacity(0);
      animate(-width, velocityX.current);

      const timeout = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);

      return () => clearTimeout(timeout);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, animate, setCurrent, width]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    cancel();
    setIsAnimating(false);
    startX.current = e.touches[0].clientX;
    startTranslateX.current = translateX;
    lastX.current = e.touches[0].clientX;
    lastTime.current = Date.now();
    setIsDragging(true);
  }, [cancel, translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX.current;
    const now = Date.now();
    const dt = now - lastTime.current;

    if (dt > 0) {
      velocityX.current = (currentX - lastX.current) / dt;
    }

    lastX.current = currentX;
    lastTime.current = now;

    const newTranslateX = Math.min(0, Math.max(-width, startTranslateX.current + deltaX));
    setTranslateX(newTranslateX);
    setCurrent(newTranslateX);

    const progress = Math.abs(newTranslateX) / width;
    setOverlayOpacity(1 - progress * 0.5);
  }, [isDragging, width, setCurrent]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const progress = Math.abs(translateX) / width;
    const shouldClose = velocityX.current < -VELOCITY_THRESHOLD || progress > DISMISS_THRESHOLD;

    if (shouldClose) {
      hapticImpact('light');
      onClose();
    } else {
      animate(0, velocityX.current * 1000);
    }

    velocityX.current = 0;
  }, [isDragging, translateX, width, animate, onClose]);

  const handleOverlayClick = useCallback(() => {
    hapticImpact('light');
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const overlayClass = `side-drawer-overlay${isDragging ? '' : ' side-drawer-overlay--animated'}`;

  return createPortal(
    <>
      <div
        className={overlayClass}
        style={{ backgroundColor: `rgba(0, 0, 0, ${0.5 * overlayOpacity})` }}
        onClick={handleOverlayClick}
      />
      <div
        ref={drawerRef}
        className="side-drawer"
        style={{
          width,
          transform: `translateX(${translateX}px)`,
          transition: (isDragging || isAnimating) ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
