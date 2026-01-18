export type InsightType = 'emotion' | 'person' | 'event';

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

export interface EventMetadata {
  category: 'activity' | 'social' | 'work' | 'travel' | 'health' | 'entertainment' | 'other';
  sentiment: 'positive' | 'negative' | 'neutral';
  location?: string;
  participants?: string[];
  source?: SourceRange;
}

export interface JournalInsight {
  id: string;
  entryId: string;
  entryDate: string;
  insightType: InsightType;
  content: string;
  metadata?: EmotionMetadata | PersonMetadata | EventMetadata;
  createdAt: string;
  sourceText?: string | null;
  sourceStart?: number | null;
  sourceEnd?: number | null;
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
  events: Array<{
    event: string;
    category: 'activity' | 'social' | 'work' | 'travel' | 'health' | 'entertainment' | 'other';
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    recentLocation?: string;
  }>;
}

export type SentimentFilter = 'all' | 'positive' | 'negative';

export type InsightTab = 'emotions' | 'people' | 'events';

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

export interface TimeGroupedEvent {
  event: string;
  category: 'activity' | 'social' | 'work' | 'travel' | 'health' | 'entertainment' | 'other';
  sentiment: 'positive' | 'negative' | 'neutral';
  location?: string;
  participants?: string[];
  entryId: string;
  entryDate: string;
  source?: SourceRange;
}
