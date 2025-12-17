export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();

  const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
  const suffixes: Record<Intl.LDMLPluralRule, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th',
    many: 'th',
    zero: 'th',
  };
  const suffix = suffixes[pr.select(day)];

  return `${day}${suffix} ${month}, ${year}`;
}
