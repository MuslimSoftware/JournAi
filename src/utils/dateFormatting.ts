export function formatEntryDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const currentYear = new Date().getFullYear();

  const dayNum = date.getDate();
  const monthStr = date.toLocaleDateString('en-US', { month: 'short' });

  if (year < currentYear) {
    return `${monthStr} ${dayNum}, ${year}`;
  }

  return `${monthStr} ${dayNum}`;
}
