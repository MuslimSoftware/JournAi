export function parseLocalDate(dateString: string): Date {
    if (dateString.includes('T')) {
        const date = new Date(dateString);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
    return toDateString(new Date());
}

export function getTodayMidnight(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

export function getTimestamp(): string {
    return new Date().toISOString();
}

export function formatEntryDate(dateString: string): string {
    const date = parseLocalDate(dateString);
    const currentYear = new Date().getFullYear();

    const dayNum = date.getDate();
    const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();

    if (year < currentYear) {
        return `${monthStr} ${dayNum}, ${year}`;
    }

    return `${monthStr} ${dayNum}`;
}
