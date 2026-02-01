import { useRef, useCallback, useEffect } from 'react';

interface SpringAnimationOptions {
  stiffness?: number;
  damping?: number;
  onComplete?: () => void;
}

export function useSpringAnimation(
  targetValue: number,
  onUpdate: (value: number) => void,
  options: SpringAnimationOptions = {}
) {
  const { stiffness = 300, damping = 30, onComplete } = options;
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const currentRef = useRef(targetValue);

  const animate = useCallback((target: number, initialVelocity = 0) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    velocityRef.current = initialVelocity;

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
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [onUpdate, stiffness, damping, onComplete]);

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
