export type InsightType =
  | 'theme'
  | 'emotion'
  | 'goal'
  | 'person'
  | 'pattern'
  | 'milestone';

export interface JournalInsight {
  id: string;
  entryId: string;
  entryDate: string;
  insightType: InsightType;
  content: string;
  metadata?: {
    confidence?: number;
    relatedEntryIds?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  createdAt: string;
}

export interface AnalyticsQueueItem {
  id: string;
  entryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsStats {
  totalInsights: number;
  insightsByType: Record<InsightType, number>;
  entriesAnalyzed: number;
  entriesPending: number;
  lastAnalyzedAt?: string;
}

export interface AggregatedInsights {
  themes: Array<{ theme: string; count: number; recentDate: string }>;
  emotions: Array<{ emotion: string; trend: 'increasing' | 'decreasing' | 'stable'; count: number }>;
  goals: Array<{ goal: string; status: 'active' | 'achieved' | 'abandoned'; mentions: number }>;
  people: Array<{ name: string; relationship?: string; sentiment: string; mentions: number }>;
  patterns: Array<{ pattern: string; frequency: string; firstSeen: string; lastSeen: string }>;
}
