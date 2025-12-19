export function formatEntryDate(dateString: string): string {
  const date = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const entryYear = date.getFullYear();

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });

  if (entryYear < currentYear) {
    return `${month} ${day}, ${entryYear}`;
  }

  return `${month} ${day}`;
}
