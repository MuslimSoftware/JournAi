import { parseLocalDate, getTodayMidnight } from './date';

export type TimeFilter =
    | 'today'
    | 'yesterday'
    | 'this-week'
    | 'last-week'
    | 'this-month'
    | 'last-month'
    | 'all-time';

export const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'all-time', label: 'All Time' },
];

function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function getTimeFilterRange(filter: TimeFilter): { start: Date; end: Date } | null {
    if (filter === 'all-time') return null;

    const now = getTodayMidnight();
    const start = new Date(now);
    const end = new Date(now);

    switch (filter) {
        case 'today':
            end.setDate(end.getDate() + 1);
            break;

        case 'yesterday':
            start.setDate(start.getDate() - 1);
            break;

        case 'this-week':
            start.setTime(getStartOfWeek(now).getTime());
            end.setDate(end.getDate() + 1);
            break;

        case 'last-week': {
            const thisWeekStart = getStartOfWeek(now);
            start.setTime(thisWeekStart.getTime());
            start.setDate(start.getDate() - 7);
            end.setTime(thisWeekStart.getTime());
            break;
        }

        case 'this-month':
            start.setTime(getStartOfMonth(now).getTime());
            end.setDate(end.getDate() + 1);
            break;

        case 'last-month': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            start.setTime(getStartOfMonth(lastMonth).getTime());
            end.setTime(getStartOfMonth(now).getTime());
            break;
        }
    }

    return { start, end };
}

export function matchesTimeFilter(dateString: string, filter: TimeFilter): boolean {
    const range = getTimeFilterRange(filter);
    if (!range) return true;

    const entryDate = parseLocalDate(dateString);
    return entryDate >= range.start && entryDate < range.end;
}
