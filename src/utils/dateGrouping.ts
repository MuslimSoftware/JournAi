export function getDateGroup(dateString: string): string {
  const entryDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  entryDate.setHours(0, 0, 0, 0);

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[entryDate.getMonth()];
  const year = entryDate.getFullYear();

  return `${month} ${year}`;
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
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    return dateB.getTime() - dateA.getTime();
  });

  monthGroups.forEach(([key, value]) => {
    sortedGroups.set(key, value);
  });

  return sortedGroups;
}
