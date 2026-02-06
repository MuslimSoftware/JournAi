import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Chat, ChatUpdate } from '../types/chatHistory';
import { usePaginatedQuery } from './usePaginatedQuery';
import * as chatsService from '../services/chats';

const PAGE_SIZE = 30;

interface ChatsSessionCache {
    chats: Chat[];
    selectedChatId: string | null;
    totalCount: number | null;
}

const chatsSessionCache: ChatsSessionCache = {
    chats: [],
    selectedChatId: null,
    totalCount: null,
};

interface UseChatsReturn {
    chats: Chat[];
    totalCount: number;
    selectedChat: Chat | null;
    selectedChatId: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    selectChat: (id: string | null) => void;
    createChat: () => Promise<Chat>;
    updateChat: (id: string, updates: ChatUpdate) => Promise<void>;
    deleteChat: (id: string) => Promise<void>;
    loadMore: () => Promise<void>;
    refreshChats: () => Promise<Chat[]>;
}

export function useChats(): UseChatsReturn {
    const hasCachedChats = chatsSessionCache.chats.length > 0;

    const queryFn = useCallback(
        async (cursor: string | null, pageSize: number) => {
            const page = await chatsService.getChatsPage(cursor, pageSize);
            return {
                data: page.chats,
                nextCursor: page.nextCursor,
                hasMore: page.hasMore,
            };
        },
        []
    );

    const {
        data: chats,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        refresh,
    } = usePaginatedQuery<Chat>({
        queryFn,
        pageSize: PAGE_SIZE,
    });

    const [selectedChatId, setSelectedChatId] = useState<string | null>(
        () => chatsSessionCache.selectedChatId
    );
    const [localChats, setLocalChats] = useState<Chat[]>(
        () => chatsSessionCache.chats
    );
    const [totalCount, setTotalCount] = useState<number>(
        () => chatsSessionCache.totalCount ?? 0
    );

    useEffect(() => {
        let cancelled = false;

        chatsService.getChatsCount()
            .then((count) => {
                if (!cancelled) {
                    setTotalCount(count);
                }
            })
            .catch((error) => {
                console.error('Failed to fetch chats count:', error);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (isLoading && chats.length === 0 && hasCachedChats) {
            return;
        }
        setLocalChats(chats);
    }, [chats, hasCachedChats, isLoading]);

    useEffect(() => {
        if (localChats.length === 0) {
            if (selectedChatId !== null) {
                setSelectedChatId(null);
            }
            return;
        }

        if (!selectedChatId || !localChats.some((chat) => chat.id === selectedChatId)) {
            setSelectedChatId(localChats[0].id);
        }
    }, [localChats, selectedChatId]);

    useEffect(() => {
        chatsSessionCache.chats = localChats;
    }, [localChats]);

    useEffect(() => {
        chatsSessionCache.selectedChatId = selectedChatId;
    }, [selectedChatId]);

    useEffect(() => {
        chatsSessionCache.totalCount = totalCount;
    }, [totalCount]);

    const selectedChat = useMemo(
        () => localChats.find(c => c.id === selectedChatId) || null,
        [localChats, selectedChatId]
    );

    const createChat = useCallback(async () => {
        try {
            const newChat = await chatsService.createChat();
            setLocalChats(prev => [newChat, ...prev]);
            setTotalCount(prev => prev + 1);
            setSelectedChatId(newChat.id);
            return newChat;
        } catch (error) {
            console.error('Failed to create chat:', error);
            throw error;
        }
    }, []);

    const updateChat = useCallback(async (id: string, updates: ChatUpdate) => {
        const updated = await chatsService.updateChat(id, updates);
        if (updated) {
            setLocalChats(prev => {
                const newChats = prev.map(c => c.id === id ? updated : c);
                newChats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                return newChats;
            });
        }
    }, []);

    const deleteChat = useCallback(async (id: string) => {
        try {
            const success = await chatsService.deleteChat(id);
            if (success) {
                setLocalChats(prev => {
                    const remaining = prev.filter(c => c.id !== id);
                    if (selectedChatId === id) {
                        setSelectedChatId(remaining.length > 0 ? remaining[0].id : null);
                    }
                    return remaining;
                });
                setTotalCount(prev => prev - 1);
            }
        } catch (error) {
            console.error('deleteChat failed:', error);
        }
    }, [selectedChatId]);

    return {
        chats: localChats,
        totalCount,
        selectedChat,
        selectedChatId,
        isLoading,
        isLoadingMore,
        hasMore,
        selectChat: setSelectedChatId,
        createChat,
        updateChat,
        deleteChat,
        loadMore,
        refreshChats: refresh,
    };
}
