import { searchFTS, select } from '../lib/db';
import { generateEmbedding, searchByVector } from './embeddings';
import { getApiKey } from '../lib/secureStorage';

export interface SearchResult {
  id: string;
  entryId: string;
  date: string;
  content: string;
  snippet: string;
  score: number;
  source: 'bm25' | 'vector' | 'hybrid';
}

export interface HybridSearchOptions {
  limit?: number;
  bm25Weight?: number;
  vectorWeight?: number;
  dateRange?: { start: string; end: string };
}

const DEFAULT_OPTIONS: Required<Omit<HybridSearchOptions, 'dateRange'>> & { dateRange: { start: string; end: string } | undefined } = {
  limit: 10,
  bm25Weight: 0.4,
  vectorWeight: 0.6,
  dateRange: undefined,
};

async function hasEmbeddings(): Promise<boolean> {
  try {
    const result = await select<{ count: number }>('SELECT COUNT(*) as count FROM embedding_chunks LIMIT 1');
    return (result[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

const MAX_ENTRY_LENGTH = 3000;

function generateSnippet(content: string, query: string, maxLength: number = MAX_ENTRY_LENGTH): string {
  if (content.length <= maxLength) {
    return content.trim();
  }

  const lower = content.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  let bestStart = 0;
  for (const term of queryTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1) {
      bestStart = Math.max(0, idx - 200);
      break;
    }
  }

  const snippet = content.slice(bestStart, bestStart + maxLength);
  return (bestStart > 0 ? '...' : '') + snippet.trim() + (bestStart + maxLength < content.length ? '...' : '');
}

export async function searchBM25(
  query: string,
  limit: number = 10,
  dateRange?: { start: string; end: string }
): Promise<SearchResult[]> {
  try {
    const results = await searchFTS(query, limit, dateRange);

    return results.map(r => ({
      id: r.id,
      entryId: r.id,
      date: r.date,
      content: r.content,
      snippet: generateSnippet(r.content, query),
      score: -r.rank,
      source: 'bm25' as const,
    }));
  } catch (error) {
    console.error('BM25 search failed:', error);
    return [];
  }
}

export async function searchVector(
  query: string,
  limit: number = 10,
  dateRange?: { start: string; end: string }
): Promise<SearchResult[]> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const queryEmbedding = await generateEmbedding(query, apiKey);
    const results = await searchByVector(queryEmbedding, limit, dateRange);

    return results.map(r => ({
      id: r.id,
      entryId: r.entryId,
      date: r.entryDate,
      content: r.content,
      snippet: generateSnippet(r.content, query),
      score: r.score,
      source: 'vector' as const,
    }));
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

function reciprocalRankFusion(
  rankings: Map<string, number>[],
  k: number = 60
): Map<string, number> {
  const fused = new Map<string, number>();

  for (const ranking of rankings) {
    const sorted = [...ranking.entries()].sort((a, b) => b[1] - a[1]);
    sorted.forEach(([id], rank) => {
      const current = fused.get(id) || 0;
      fused.set(id, current + 1 / (k + rank + 1));
    });
  }

  return fused;
}

export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const embeddingsExist = await hasEmbeddings();

  const searchPromises: Promise<SearchResult[]>[] = [
    searchBM25(query, opts.limit * 2, opts.dateRange),
  ];

  if (embeddingsExist) {
    searchPromises.push(searchVector(query, opts.limit * 2, opts.dateRange));
  }

  const [bm25Results, vectorResults = []] = await Promise.all(searchPromises);

  if (bm25Results.length === 0 && vectorResults.length === 0) {
    return [];
  }

  const bm25Ranking = new Map<string, number>();
  const vectorRanking = new Map<string, number>();
  const resultMap = new Map<string, SearchResult>();

  bm25Results.forEach((r, i) => {
    bm25Ranking.set(r.entryId, bm25Results.length - i);
    resultMap.set(r.entryId, r);
  });

  vectorResults.forEach((r, i) => {
    vectorRanking.set(r.entryId, vectorResults.length - i);
    if (!resultMap.has(r.entryId)) {
      resultMap.set(r.entryId, r);
    }
  });

  const rankings = [bm25Ranking];
  if (vectorResults.length > 0) {
    rankings.push(vectorRanking);
  }

  const fusedScores = reciprocalRankFusion(rankings);

  const results = [...fusedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.limit)
    .map(([entryId, score]) => {
      const result = resultMap.get(entryId)!;
      return {
        ...result,
        score,
        source: 'hybrid' as const,
      };
    });

  return results;
}

export async function searchEntries(
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  return hybridSearch(query, options);
}
