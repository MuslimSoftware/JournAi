import type { ChatMessage, MessageRole, MessageStatus } from '../types/chat';
import type { Citation, RAGContext } from '../types/memory';
import { getTimestamp } from '../utils/date';
import { select, execute } from '../lib/db';

interface MessageRow {
    id: string;
    chat_id: string;
    role: string;
    content: string;
    status: string | null;
    citations: string | null;
    rag_context: string | null;
    created_at: string;
}

function rowToMessage(row: MessageRow): ChatMessage {
    let citations: Citation[] | undefined;
    if (row.citations) {
        try {
            citations = JSON.parse(row.citations);
        } catch {
            citations = undefined;
        }
    }

    let ragContext: RAGContext | undefined;
    if (row.rag_context) {
        try {
            ragContext = JSON.parse(row.rag_context);
        } catch {
            ragContext = undefined;
        }
    }

    return {
        id: row.id,
        role: row.role as MessageRole,
        content: row.content,
        timestamp: new Date(row.created_at),
        status: (row.status as MessageStatus) || undefined,
        citations,
        ragContext,
    };
}

export async function getMessages(chatId: string): Promise<ChatMessage[]> {
    const rows = await select<MessageRow>(
        'SELECT id, chat_id, role, content, status, citations, rag_context, created_at FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chatId]
    );
    return rows.map(rowToMessage);
}

export async function addMessage(
    chatId: string,
    message: Pick<ChatMessage, 'id' | 'role' | 'content' | 'status' | 'citations' | 'ragContext'>
): Promise<void> {
    const timestamp = getTimestamp();
    const citationsJson = message.citations ? JSON.stringify(message.citations) : null;
    const ragContextJson = message.ragContext ? JSON.stringify(message.ragContext) : null;
    await execute(
        'INSERT INTO chat_messages (id, chat_id, role, content, status, citations, rag_context, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [message.id, chatId, message.role, message.content, message.status || null, citationsJson, ragContextJson, timestamp]
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
