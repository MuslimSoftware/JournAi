export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const YEAR_RANGE = 10;

export const STICKY_NOTE_DEBOUNCE_MS = 500;

export const DRAG_THRESHOLD_PX = 8;

export function getYearOptions(currentYear: number) {
  return Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => ({
    value: currentYear - YEAR_RANGE + i,
    label: String(currentYear - YEAR_RANGE + i),
  }));
}

export function getMonthOptions() {
  return MONTH_NAMES.map((name, i) => ({ value: i, label: name }));
}
