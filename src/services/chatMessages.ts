import type { ChatMessage, MessageRole, MessageStatus } from '../types/chat';
import { getTimestamp } from '../utils/date';
import { select, execute } from '../lib/db';

interface MessageRow {
    id: string;
    chat_id: string;
    role: string;
    content: string;
    status: string | null;
    created_at: string;
}

function rowToMessage(row: MessageRow): ChatMessage {
    return {
        id: row.id,
        role: row.role as MessageRole,
        content: row.content,
        timestamp: new Date(row.created_at),
        status: (row.status as MessageStatus) || undefined,
    };
}

export async function getMessages(chatId: string): Promise<ChatMessage[]> {
    const rows = await select<MessageRow>(
        'SELECT id, chat_id, role, content, status, created_at FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chatId]
    );
    return rows.map(rowToMessage);
}

export async function addMessage(
    chatId: string,
    message: Pick<ChatMessage, 'id' | 'role' | 'content' | 'status'>
): Promise<void> {
    const timestamp = getTimestamp();
    await execute(
        'INSERT INTO chat_messages (id, chat_id, role, content, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [message.id, chatId, message.role, message.content, message.status || null, timestamp]
    );
}

export async function updateMessage(
    id: string,
    updates: { content?: string; status?: MessageStatus }
): Promise<void> {
    if (updates.content !== undefined) {
        await execute(
            'UPDATE chat_messages SET content = $1 WHERE id = $2',
            [updates.content, id]
        );
    }

    if (updates.status !== undefined) {
        await execute(
            'UPDATE chat_messages SET status = $1 WHERE id = $2',
            [updates.status, id]
        );
    }
}

export async function deleteMessage(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM chat_messages WHERE id = $1', [id]);
    return result.rowsAffected > 0;
}

export async function getMessageCount(chatId: string): Promise<number> {
    const rows = await select<{ count: number }>(
        'SELECT COUNT(*) as count FROM chat_messages WHERE chat_id = $1',
        [chatId]
    );
    return rows[0]?.count ?? 0;
}
