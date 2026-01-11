import { createContext, useContext, useState, ReactNode } from 'react';
import type { AggregatedInsights, TimeGroupedInsight, TimeGroupedPerson } from '../types/analytics';

type TimeFilter =
  | 'last7' | 'last30' | 'last90'
  | 'thisWeek' | 'lastWeek'
  | 'thisMonth' | 'lastMonth'
  | 'thisYear' | 'lastYear'
  | 'all';

type SentimentFilter = 'all' | 'positive' | 'negative' | 'mixed';

interface InsightsState {
  aggregated: AggregatedInsights | null;
  rawEmotions: TimeGroupedInsight[];
  rawPeople: TimeGroupedPerson[];
  selectedEmotion: string | null;
  selectedPerson: string | null;
  timeFilter: TimeFilter;
  sentimentFilter: SentimentFilter;
  dataLoaded: boolean;
}

interface InsightsContextType extends InsightsState {
  setAggregated: (data: AggregatedInsights | null) => void;
  setRawEmotions: (data: TimeGroupedInsight[]) => void;
  setRawPeople: (data: TimeGroupedPerson[]) => void;
  setSelectedEmotion: (emotion: string | null) => void;
  setSelectedPerson: (person: string | null) => void;
  setTimeFilter: (filter: TimeFilter) => void;
  setSentimentFilter: (filter: SentimentFilter) => void;
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('last30');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [dataLoaded, setDataLoaded] = useState(false);

  const resetSelections = () => {
    setSelectedEmotion(null);
    setSelectedPerson(null);
  };

  return (
    <InsightsContext.Provider
      value={{
        aggregated,
        rawEmotions,
        rawPeople,
        selectedEmotion,
        selectedPerson,
        timeFilter,
        sentimentFilter,
        dataLoaded,
        setAggregated,
        setRawEmotions,
        setRawPeople,
        setSelectedEmotion,
        setSelectedPerson,
        setTimeFilter,
        setSentimentFilter,
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
