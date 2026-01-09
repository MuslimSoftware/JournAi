export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generatePreview(content: string, maxLength: number = 100): string {
    const normalized = content.replace(/\n+/g, ' ').trim();
    return normalized.length > maxLength ? normalized.substring(0, maxLength) + '...' : normalized;
}
