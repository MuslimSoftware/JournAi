import { getDateGroup } from './dateGrouping';

export type InsightTimeGroup = 'This Week' | 'This Month' | 'Older';

const RECENT_GROUPS = ['Today', 'Yesterday', 'This Week', 'Last Week'];
const MONTH_GROUPS = ['This Month'];

export function getSimplifiedTimeGroup(dateString: string): InsightTimeGroup {
  const group = getDateGroup(dateString);

  if (RECENT_GROUPS.includes(group)) {
    return 'This Week';
  }

  if (MONTH_GROUPS.includes(group)) {
    return 'This Month';
  }

  return 'Older';
}

export function groupInsightsByTime<T extends { entryDate: string }>(
  insights: T[]
): Map<InsightTimeGroup, T[]> {
  const groups = new Map<InsightTimeGroup, T[]>();
  const order: InsightTimeGroup[] = ['This Week', 'This Month', 'Older'];

  order.forEach(g => groups.set(g, []));

  insights.forEach(insight => {
    const group = getSimplifiedTimeGroup(insight.entryDate);
    groups.get(group)?.push(insight);
  });

  for (const [key, value] of groups) {
    if (value.length === 0) groups.delete(key);
  }

  const sortedGroups = new Map<InsightTimeGroup, T[]>();
  order.forEach(g => {
    if (groups.has(g)) {
      sortedGroups.set(g, groups.get(g)!);
    }
  });

  return sortedGroups;
}
