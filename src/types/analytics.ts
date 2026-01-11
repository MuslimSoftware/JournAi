export type InsightType = 'emotion' | 'person';

export type RelationshipSentiment = 'positive' | 'negative' | 'neutral' | 'tense' | 'mixed';

export interface EmotionMetadata {
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PersonMetadata {
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
}

export interface JournalInsight {
  id: string;
  entryId: string;
  entryDate: string;
  insightType: InsightType;
  content: string;
  metadata?: EmotionMetadata | PersonMetadata;
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
  emotions: Array<{
    emotion: string;
    avgIntensity: number;
    count: number;
    triggers: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  people: Array<{
    name: string;
    relationship?: string;
    sentiment: RelationshipSentiment;
    mentions: number;
    recentContext?: string;
  }>;
}
