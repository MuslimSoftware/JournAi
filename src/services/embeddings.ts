import { select, execute } from '../lib/db';
import { getApiKey } from '../lib/secureStorage';
import type { EmbeddingMetadata, EmbeddingStats } from '../types/memory';

export type { EmbeddingStats } from '../types/memory';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 80;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function chunkText(text: string, chunkSize: number = CHUNK_SIZE * 4, overlap: number = CHUNK_OVERLAP * 4): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(c => c.length > 50);
}

export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export async function generateEmbeddingsBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

function embeddingToBlob(embedding: number[]): Uint8Array {
  const buffer = new Float32Array(embedding);
  return new Uint8Array(buffer.buffer);
}

function blobToEmbedding(blob: Uint8Array): number[] {
  const buffer = new Float32Array(blob.buffer);
  return Array.from(buffer);
}

export async function embedEntry(entryId: string, entryDate: string, content: string): Promise<number> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key configured');

  await execute('DELETE FROM embedding_chunks WHERE entry_id = $1', [entryId]);

  const chunks = chunkText(content);
  if (chunks.length === 0) return 0;

  const embeddings = await generateEmbeddingsBatch(chunks, apiKey);
  const timestamp = new Date().toISOString();

  for (let i = 0; i < chunks.length; i++) {
    const id = generateId();
    const blob = embeddingToBlob(embeddings[i]);

    await execute(
      `INSERT INTO embedding_chunks (id, entry_id, entry_date, content, embedding, chunk_index, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, entryId, entryDate, chunks[i], blob, i, timestamp]
    );
  }

  return chunks.length;
}

export async function deleteEntryEmbeddings(entryId: string): Promise<void> {
  await execute('DELETE FROM embedding_chunks WHERE entry_id = $1', [entryId]);
}

export async function clearAllEmbeddings(): Promise<void> {
  await execute('DELETE FROM embedding_chunks');
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface ChunkRow {
  id: string;
  entry_id: string;
  entry_date: string;
  content: string;
  embedding: Uint8Array;
  chunk_index: number;
}

const MIN_SIMILARITY_THRESHOLD = 0.35;

export async function searchByVector(
  queryEmbedding: number[],
  limit: number = 10,
  dateRange?: { start: string; end: string },
  minSimilarity: number = MIN_SIMILARITY_THRESHOLD
): Promise<Array<EmbeddingMetadata & { score: number }>> {
  let query = 'SELECT id, entry_id, entry_date, content, embedding, chunk_index FROM embedding_chunks';
  const values: unknown[] = [];

  if (dateRange) {
    query += ' WHERE entry_date >= $1 AND entry_date <= $2';
    values.push(dateRange.start, dateRange.end);
  }

  const rows = await select<ChunkRow>(query, values);

  const scored = rows.map(row => ({
    id: row.id,
    entryId: row.entry_id,
    entryDate: row.entry_date,
    content: row.content,
    chunkIndex: row.chunk_index,
    score: cosineSimilarity(queryEmbedding, blobToEmbedding(row.embedding)),
  }));

  scored.sort((a, b) => b.score - a.score);

  const filtered = scored.filter(r => r.score >= minSimilarity);
  return filtered.slice(0, limit);
}

export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const chunks = await select<{ count: number }>('SELECT COUNT(*) as count FROM embedding_chunks');
  const embeddedEntries = await select<{ entry_id: string }>('SELECT DISTINCT entry_id FROM embedding_chunks');
  const totalEntries = await select<{ count: number }>('SELECT COUNT(*) as count FROM entries');

  return {
    totalChunks: chunks[0]?.count ?? 0,
    entriesWithEmbeddings: embeddedEntries.length,
    totalEntries: totalEntries[0]?.count ?? 0,
    embeddedEntryIds: embeddedEntries.map(e => e.entry_id),
  };
}

export async function isEntryEmbedded(entryId: string): Promise<boolean> {
  const result = await select<{ count: number }>(
    'SELECT COUNT(*) as count FROM embedding_chunks WHERE entry_id = $1',
    [entryId]
  );
  return (result[0]?.count ?? 0) > 0;
}

export async function getUnembeddedEntries(minAgeMinutes: number = 0): Promise<Array<{ id: string; date: string; content: string }>> {
  const cutoffTime = new Date(Date.now() - minAgeMinutes * 60 * 1000).toISOString();
  const rows = await select<{ id: string; date: string; content: string }>(
    `SELECT e.id, e.date, e.content FROM entries e
     WHERE e.id NOT IN (SELECT DISTINCT entry_id FROM embedding_chunks)
     AND LENGTH(e.content) > 50
     AND e.updated_at <= $1
     ORDER BY e.date DESC`,
    [cutoffTime]
  );
  return rows;
}

export async function embedAllEntries(
  onProgress?: (current: number, total: number, entryId: string, chunkCount?: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key configured');

  const unembedded = await getUnembeddedEntries();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < unembedded.length; i++) {
    const entry = unembedded[i];

    try {
      const chunkCount = await embedEntry(entry.id, entry.date, entry.content);
      success++;
      onProgress?.(i + 1, unembedded.length, entry.id, chunkCount);
    } catch (error) {
      failed++;
      errors.push(`Entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`);
      onProgress?.(i + 1, unembedded.length, entry.id, 0);
    }
  }

  return { success, failed, errors };
}

const EMBEDDING_DEBOUNCE_MINUTES = 5;
const BACKGROUND_CHECK_INTERVAL_MS = 60 * 1000;

let backgroundEmbeddingInterval: ReturnType<typeof setInterval> | null = null;
let isBackgroundEmbedding = false;

export async function embedStaleEntries(): Promise<{ success: number; failed: number }> {
  if (isBackgroundEmbedding) return { success: 0, failed: 0 };

  const apiKey = await getApiKey();
  if (!apiKey) return { success: 0, failed: 0 };

  isBackgroundEmbedding = true;

  try {
    const staleEntries = await getUnembeddedEntries(EMBEDDING_DEBOUNCE_MINUTES);
    let success = 0;
    let failed = 0;

    for (const entry of staleEntries) {
      try {
        await embedEntry(entry.id, entry.date, entry.content);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  } finally {
    isBackgroundEmbedding = false;
  }
}

export function startBackgroundEmbedding(): void {
  if (backgroundEmbeddingInterval) return;

  embedStaleEntries().catch(console.error);

  backgroundEmbeddingInterval = setInterval(() => {
    embedStaleEntries().catch(console.error);
  }, BACKGROUND_CHECK_INTERVAL_MS);
}

export function stopBackgroundEmbedding(): void {
  if (backgroundEmbeddingInterval) {
    clearInterval(backgroundEmbeddingInterval);
    backgroundEmbeddingInterval = null;
  }
}
