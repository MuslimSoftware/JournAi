import { parseLocalDate, getTodayMidnight } from './date';

export function getDateGroup(dateString: string): string {
  const entryDate = parseLocalDate(dateString);
  const today = getTodayMidnight();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  if (entryDate.getTime() === today.getTime()) {
    return 'Today';
  }

  if (entryDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  if (entryDate >= startOfWeek && entryDate < today) {
    return 'This Week';
  }

  if (entryDate >= startOfLastWeek && entryDate < startOfWeek) {
    return 'Last Week';
  }

  if (entryDate >= startOfMonth && entryDate < startOfLastWeek) {
    return 'This Month';
  }

  const currentYear = new Date().getFullYear();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[entryDate.getMonth()];
  const year = entryDate.getFullYear();

  if (year < currentYear) {
    return `${month} ${year}`;
  }

  return month;
}

export function groupEntriesByDate<T extends { date: string }>(entries: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  entries.forEach(entry => {
    const group = getDateGroup(entry.date);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)?.push(entry);
  });

  const sortedGroups = new Map<string, T[]>();
  const recentGroups = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month'];

  recentGroups.forEach(group => {
    if (groups.has(group)) {
      sortedGroups.set(group, groups.get(group)!);
      groups.delete(group);
    }
  });

  const monthGroups = Array.from(groups.entries()).sort((a, b) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const parseMonthYear = (str: string) => {
      const parts = str.split(' ');
      const monthIndex = monthNames.indexOf(parts[0]);
      const year = parts[1] ? parseInt(parts[1]) : new Date().getFullYear();
      return new Date(year, monthIndex, 1);
    };
    return parseMonthYear(b[0]).getTime() - parseMonthYear(a[0]).getTime();
  });

  monthGroups.forEach(([key, value]) => {
    sortedGroups.set(key, value);
  });

  return sortedGroups;
}
