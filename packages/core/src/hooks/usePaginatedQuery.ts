import { useState, useEffect, useCallback, useRef } from 'react';

export interface PaginatedResponse<T> {
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface UsePaginatedQueryOptions<T> {
    queryFn: (cursor: string | null, pageSize: number) => Promise<PaginatedResponse<T>>;
    pageSize?: number;
    enabled?: boolean;
}

export interface UsePaginatedQueryReturn<T> {
    data: T[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<T[]>;
}

export function usePaginatedQuery<T>({
    queryFn,
    pageSize = 30,
    enabled = true,
}: UsePaginatedQueryOptions<T>): UsePaginatedQueryReturn<T> {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const cursorRef = useRef<string | null>(null);

    const loadInitial = useCallback(async () => {
        if (!enabled) {
            setIsLoading(false);
            return [];
        }

        try {
            cursorRef.current = null;
            const response = await queryFn(null, pageSize);
            setData(response.data);
            cursorRef.current = response.nextCursor;
            setHasMore(response.hasMore);
            setIsLoading(false);
            return response.data;
        } catch (error) {
            console.error('usePaginatedQuery: loadInitial failed', error);
            setIsLoading(false);
            return [];
        }
    }, [queryFn, pageSize, enabled]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || !cursorRef.current || !enabled) return;

        setIsLoadingMore(true);
        try {
            const response = await queryFn(cursorRef.current, pageSize);
            setData(prev => [...prev, ...response.data]);
            cursorRef.current = response.nextCursor;
            setHasMore(response.hasMore);
        } catch (error) {
            console.error('usePaginatedQuery: loadMore failed', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [queryFn, pageSize, isLoadingMore, hasMore, enabled]);

    const refresh = useCallback(async () => {
        return loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    return {
        data,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        refresh,
    };
}
