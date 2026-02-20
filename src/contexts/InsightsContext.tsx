import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AggregatedInsights, TimeGroupedInsight, TimeGroupedPerson } from '../types/analytics';

export type TimeFilter =
  | 'last7' | 'last30' | 'last90'
  | 'thisWeek' | 'lastWeek'
  | 'thisMonth' | 'lastMonth'
  | 'thisYear' | 'lastYear'
  | 'all';

export type SentimentFilter = 'all' | 'positive' | 'negative' | 'mixed';

export type InsightTypeFilter = 'all' | 'emotions' | 'people';

const DEFAULT_TIME_FILTER: TimeFilter = 'last30';
const DEFAULT_SENTIMENT_FILTER: SentimentFilter = 'all';
const DEFAULT_TYPE_FILTER: InsightTypeFilter = 'all';

interface InsightsState {
  aggregated: AggregatedInsights | null;
  rawEmotions: TimeGroupedInsight[];
  rawPeople: TimeGroupedPerson[];
  selectedEmotion: string | null;
  selectedPerson: string | null;
  selectedOccurrenceIndex: number | null;
  timeFilter: TimeFilter;
  sentimentFilter: SentimentFilter;
  typeFilter: InsightTypeFilter;
  dataLoaded: boolean;
}

interface InsightsContextType extends InsightsState {
  setAggregated: (data: AggregatedInsights | null) => void;
  setRawEmotions: (data: TimeGroupedInsight[]) => void;
  setRawPeople: (data: TimeGroupedPerson[]) => void;
  setSelectedEmotion: (emotion: string | null) => void;
  setSelectedPerson: (person: string | null) => void;
  setSelectedOccurrenceIndex: (index: number | null) => void;
  setTimeFilter: (filter: TimeFilter) => void;
  setSentimentFilter: (filter: SentimentFilter) => void;
  setTypeFilter: (filter: InsightTypeFilter) => void;
  setDataLoaded: (loaded: boolean) => void;
  resetSelections: () => void;
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

export function InsightsProvider({ children }: { children: ReactNode }) {
  const [aggregated, setAggregated] = useState<AggregatedInsights | null>(null);
  const [rawEmotions, setRawEmotions] = useState<TimeGroupedInsight[]>([]);
  const [rawPeople, setRawPeople] = useState<TimeGroupedPerson[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedOccurrenceIndex, setSelectedOccurrenceIndex] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(DEFAULT_TIME_FILTER);
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>(DEFAULT_SENTIMENT_FILTER);
  const [typeFilter, setTypeFilter] = useState<InsightTypeFilter>(DEFAULT_TYPE_FILTER);
  const [dataLoaded, setDataLoaded] = useState(false);

  const resetSelections = () => {
    setSelectedEmotion(null);
    setSelectedPerson(null);
    setSelectedOccurrenceIndex(null);
  };

  return (
    <InsightsContext.Provider
      value={{
        aggregated,
        rawEmotions,
        rawPeople,
        selectedEmotion,
        selectedPerson,
        selectedOccurrenceIndex,
        timeFilter,
        sentimentFilter,
        typeFilter,
        dataLoaded,
        setAggregated,
        setRawEmotions,
        setRawPeople,
        setSelectedEmotion,
        setSelectedPerson,
        setSelectedOccurrenceIndex,
        setTimeFilter,
        setSentimentFilter,
        setTypeFilter,
        setDataLoaded,
        resetSelections,
      }}
    >
      {children}
    </InsightsContext.Provider>
  );
}

export function useInsights() {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
}
