import type { Chat, ChatUpdate } from '../types/chatHistory';
import type { OpenAIModel } from '../types/chat';
import { getTimestamp } from '../utils/date';
import { generateId, generatePreview } from '../utils/generators';
import { select, execute, selectPaginated } from '../lib/db';

const CHAT_PREVIEW_LENGTH = 80;

interface ChatRow {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface MessagePreviewRow {
    content: string;
}

async function getLatestMessage(chatId: string): Promise<string | null> {
    const rows = await select<MessagePreviewRow>(
        "SELECT content FROM chat_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1",
        [chatId]
    );
    return rows[0]?.content || null;
}

async function rowToChat(row: ChatRow): Promise<Chat> {
    const latestMessage = await getLatestMessage(row.id);
    return {
        id: row.id,
        title: row.title,
        preview: latestMessage ? generatePreview(latestMessage, CHAT_PREVIEW_LENGTH) : '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export interface ChatsPage {
    chats: Chat[];
    nextCursor: string | null;
    hasMore: boolean;
}

export async function getChatsPage(cursor: string | null, limit: number = 20): Promise<ChatsPage> {
    const result = await selectPaginated<ChatRow, ChatRow>(
        'SELECT id, title, created_at, updated_at FROM chats',
        [
            { column: 'updated_at', direction: 'DESC' },
            { column: 'id', direction: 'DESC' },
        ],
        { cursor, limit },
        (row) => row,
        { columns: ['updated_at', 'id'], separator: '|' }
    );

    const chats = await Promise.all(result.items.map(rowToChat));

    return {
        chats,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
    };
}

export async function getChat(id: string): Promise<Chat | null> {
    const rows = await select<ChatRow>(
        'SELECT id, title, created_at, updated_at FROM chats WHERE id = $1',
        [id]
    );

    if (rows.length === 0) return null;
    return rowToChat(rows[0]);
}

export async function createChat(title: string = 'New Chat'): Promise<Chat> {
    const id = generateId();
    const timestamp = getTimestamp();

    await execute(
        'INSERT INTO chats (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)',
        [id, title, timestamp, timestamp]
    );

    return { id, title, preview: '', createdAt: timestamp, updatedAt: timestamp };
}

export async function updateChat(id: string, updates: ChatUpdate): Promise<Chat | null> {
    const timestamp = getTimestamp();

    if (updates.title !== undefined) {
        await execute(
            'UPDATE chats SET title = $1, updated_at = $2 WHERE id = $3',
            [updates.title, timestamp, id]
        );
    }

    return getChat(id);
}

export async function deleteChat(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM chats WHERE id = $1', [id]);
    return result.rowsAffected > 0;
}

export async function getChatsCount(): Promise<number> {
    const rows = await select<{ count: number }>('SELECT COUNT(*) as count FROM chats');
    return rows[0]?.count ?? 0;
}

export async function touchChat(id: string): Promise<void> {
    const timestamp = getTimestamp();
    await execute('UPDATE chats SET updated_at = $1 WHERE id = $2', [timestamp, id]);
}

const TITLE_GENERATION_PROMPT = `Generate a concise title (3-6 words) for this conversation. Return only the title, no quotes or explanation.`;

export async function generateChatTitle(
    messages: { role: 'user' | 'assistant'; content: string }[],
    apiKey: string,
    _model: OpenAIModel
): Promise<string> {
    const conversationSummary = messages
        .slice(0, 4)
        .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
        .join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4.1-nano',
            messages: [
                { role: 'system', content: TITLE_GENERATION_PROMPT },
                { role: 'user', content: conversationSummary },
            ],
            max_tokens: 20,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to generate title');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || 'New Chat';
}
