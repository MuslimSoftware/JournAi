export interface PaginatedResult<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface CursorConfig {
    columns: string[];
    separator?: string;
}

export interface PaginationOptions {
    cursor?: string | null;
    limit?: number;
}
