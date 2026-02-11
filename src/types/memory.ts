export interface EmbeddingChunk {
  id: string;
  entryId: string;
  entryDate: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: string;
}

export interface EmbeddingMetadata {
  id: string;
  entryId: string;
  entryDate: string;
  content: string;
  chunkIndex: number;
}

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'place' | 'event' | 'topic';
  firstMentioned: string;
  lastMentioned: string;
  mentionCount: number;
  aliases: string[];
}

export interface EntityMention {
  entityId: string;
  entryId: string;
  entryDate: string;
  context: string;
}

export interface SearchContext {
  query: string;
  timeRange?: { start: string; end: string };
  entities?: string[];
  limit?: number;
}

export interface EmbeddingStats {
  totalChunks: number;
  entriesWithEmbeddings: number;
  totalEntries: number;
  embeddedEntryIds: string[];
}

export interface Citation {
  entryId: string;
}

export interface CitationWithContent extends Citation {
  entryDate: string;
  snippet: string;
}

export interface FilteredEmotionInsight {
  type: 'emotion';
  emotion: string;
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  entryId: string;
  entryDate: string;
  sourceText?: string;
  sourceStart?: number;
  sourceEnd?: number;
}

export interface FilteredPersonInsight {
  type: 'person';
  name: string;
  relationship?: string;
  sentiment: string;
  context?: string;
  entryId: string;
  entryDate: string;
  sourceText?: string;
  sourceStart?: number;
  sourceEnd?: number;
}

export type FilteredInsight = FilteredEmotionInsight | FilteredPersonInsight;

export interface RAGContext {
  citations: Citation[];
  entities: string[];
  timeRange?: { start: string; end: string };
  contextText?: string;
  insights?: FilteredInsight[];
}
