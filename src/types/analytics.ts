export type InsightType = 'emotion' | 'person';

export type RelationshipSentiment = 'positive' | 'negative' | 'neutral' | 'tense' | 'mixed';

export interface SourceRange {
  start: number;
  end: number;
  quote: string;
}

export interface EmotionMetadata {
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  source?: SourceRange;
}

export interface PersonMetadata {
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
  source?: SourceRange;
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

export type SentimentFilter = 'all' | 'positive' | 'negative';

export type InsightTab = 'emotions' | 'people';

export interface TimeGroupedInsight {
  emotion: string;
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  entryId: string;
  entryDate: string;
  source?: SourceRange;
}

export interface TimeGroupedPerson {
  name: string;
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
  entryId: string;
  entryDate: string;
  source?: SourceRange;
}
