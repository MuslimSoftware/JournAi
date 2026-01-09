type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface HapticPattern {
  duration: number;
  intensity?: number;
}

const HAPTIC_PATTERNS: Record<HapticStyle, HapticPattern> = {
  light: { duration: 10 },
  medium: { duration: 20 },
  heavy: { duration: 30 },
  selection: { duration: 10 },
  success: { duration: 15 },
  warning: { duration: 20 },
  error: { duration: 30 },
};

function triggerHaptic(style: HapticStyle): void {
  if (!('vibrate' in navigator)) return;

  const pattern = HAPTIC_PATTERNS[style];
  navigator.vibrate(pattern.duration);
}

export function useHaptics() {
  const impact = (style: HapticStyle = 'medium') => {
    triggerHaptic(style);
  };

  const selection = () => {
    triggerHaptic('selection');
  };

  const notification = (type: 'success' | 'warning' | 'error') => {
    triggerHaptic(type);
  };

  return {
    impact,
    selection,
    notification,
  };
}

export function hapticImpact(style: HapticStyle = 'medium'): void {
  triggerHaptic(style);
}

export function hapticSelection(): void {
  triggerHaptic('selection');
}

export function hapticNotification(type: 'success' | 'warning' | 'error'): void {
  triggerHaptic(type);
}
