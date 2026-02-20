import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Text, Spinner } from "../components/themed";
import { useIsMobile } from "../hooks/useMediaQuery";
import MobilePageHeader from "../components/mobile/MobilePageHeader";
import {
  useInsights,
  TimeFilter,
  SentimentFilter,
  InsightTypeFilter,
} from "../contexts/InsightsContext";
import { useEntryNavigation } from "../contexts/EntryNavigationContext";
import {
  getAggregatedInsights,
  getRawEmotionInsights,
  getRawPersonInsights,
} from "../services/analytics";
import { parseLocalDate } from "../utils/date";
import { hapticSelection } from "../hooks/useHaptics";
import { useTheme } from "../contexts/ThemeContext";
import { useProcessing } from "../contexts/ProcessingContext";
import "../styles/insights.css";

const INTENSITY_BAR_COUNT = 10;
const RAW_INSIGHTS_QUERY_LIMIT = 500;

interface TimeFilterGroup {
  label: string;
  options: { value: TimeFilter; label: string }[];
}

const TIME_FILTER_GROUPS: TimeFilterGroup[] = [
  {
    label: "Rolling",
    options: [
      { value: "last7", label: "Last 7 Days" },
      { value: "last30", label: "Last 30 Days" },
      { value: "last90", label: "Last 90 Days" },
    ],
  },
  {
    label: "Weekly",
    options: [
      { value: "thisWeek", label: "This Week" },
      { value: "lastWeek", label: "Last Week" },
    ],
  },
  {
    label: "Monthly",
    options: [
      { value: "thisMonth", label: "This Month" },
      { value: "lastMonth", label: "Last Month" },
    ],
  },
  {
    label: "Yearly",
    options: [
      { value: "thisYear", label: "This Year" },
      { value: "lastYear", label: "Last Year" },
    ],
  },
  {
    label: "",
    options: [{ value: "all", label: "All Time" }],
  },
];

function getFilterLabel(filter: TimeFilter): string {
  for (const group of TIME_FILTER_GROUPS) {
    const option = group.options.find((o) => o.value === filter);
    if (option) return option.label;
  }
  return "Select";
}

function getDateRange(
  filter: TimeFilter,
): { start: string; end: string } | null {
  if (filter === "all") return null;

  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;

  switch (filter) {
    case "last7": {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    }
    case "last30": {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      break;
    }
    case "last90": {
      start = new Date(now);
      start.setDate(now.getDate() - 90);
      break;
    }
    case "thisWeek": {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      break;
    }
    case "lastWeek": {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + 6);
      return {
        start: start.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
    case "thisMonth": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "lastMonth": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: start.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
    case "thisYear": {
      start = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case "lastYear": {
      start = new Date(now.getFullYear() - 1, 0, 1);
      const endDate = new Date(now.getFullYear() - 1, 11, 31);
      return {
        start: start.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
  }

  return { start: start.toISOString().split("T")[0], end };
}

type SentimentColorKey = "positive" | "negative" | "neutral" | "mixed" | "tense";

function formatDateWithoutYear(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getYear(dateStr: string): number {
  return parseLocalDate(dateStr).getFullYear();
}

function groupByYear<T extends { entryDate: string }>(
  items: T[],
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const year = getYear(item.entryDate);
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year)!.push(item);
  }
  return new Map([...groups.entries()].sort((a, b) => b[0] - a[0]));
}

type AggregatedEmotion = {
  emotion: string;
  avgIntensity: number;
  count: number;
  triggers: string[];
  sentiment: "positive" | "negative" | "neutral";
};
type AggregatedPerson = {
  name: string;
  relationship?: string;
  sentiment: string;
  mentions: number;
  recentContext?: string;
};

function filterEmotionsBySentiment(
  emotions: AggregatedEmotion[] | undefined,
  filter: SentimentFilter,
) {
  if (!emotions || filter === "all") return emotions;
  if (filter === "mixed")
    return emotions.filter((e) => e.sentiment === "neutral");
  return emotions.filter((e) => e.sentiment === filter);
}

function filterPeopleBySentiment(
  people: AggregatedPerson[] | undefined,
  filter: SentimentFilter,
) {
  if (!people || filter === "all") return people;
  if (filter === "mixed")
    return people.filter(
      (p) => p.sentiment === "mixed" || p.sentiment === "tense",
    );
  if (filter === "negative")
    return people.filter(
      (p) => p.sentiment === "negative" || p.sentiment === "tense",
    );
  return people.filter((p) => p.sentiment === filter);
}

export default function Insights() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const { isProcessing, progress, cancelRequested } = useProcessing();

  const sentimentColors: Record<SentimentColorKey, string> = {
    positive: theme.colors.sentiment.positive,
    negative: theme.colors.sentiment.negative,
    neutral: theme.colors.sentiment.neutral,
    mixed: theme.colors.sentiment.mixed,
    tense: theme.colors.sentiment.negative,
  };

  const getSentimentColor = (sentiment: string): string =>
    sentimentColors[sentiment as SentimentColorKey] || sentimentColors.neutral;
  const { navigateToEntry } = useEntryNavigation();
  const {
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
  } = useInsights();

  const [loading, setLoading] = useState(!dataLoaded);
  const [error, setError] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [emotionSentimentFilter, setEmotionSentimentFilter] =
    useState<SentimentFilter>("all");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const lastLoadedFilter = useRef<string | null>(
    dataLoaded ? timeFilter : null,
  );

  useEffect(() => {
    if (!showFilterDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterDropdown]);

  useEffect(() => {
    const handleInsightsChanged = () => {
      lastLoadedFilter.current = null;
      setReloadTrigger((n) => n + 1);
    };
    window.addEventListener("insights-changed", handleInsightsChanged);
    return () =>
      window.removeEventListener("insights-changed", handleInsightsChanged);
  }, []);

  useEffect(() => {
    if (lastLoadedFilter.current === timeFilter) return;

    const isBackgroundRefresh = dataLoaded && lastLoadedFilter.current === null;
    const loadData = async () => {
      if (!isBackgroundRefresh) setLoading(true);
      setError(null);
      try {
        const range = getDateRange(timeFilter);
        const [agg, emotions, people] = await Promise.all([
          getAggregatedInsights(range?.start, range?.end),
          getRawEmotionInsights(
            RAW_INSIGHTS_QUERY_LIMIT,
            range?.start,
            range?.end,
          ),
          getRawPersonInsights(
            RAW_INSIGHTS_QUERY_LIMIT,
            range?.start,
            range?.end,
          ),
        ]);
        setAggregated(agg);
        setRawEmotions(emotions);
        setRawPeople(people);
        setDataLoaded(true);
        lastLoadedFilter.current = timeFilter;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load insights",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    timeFilter,
    reloadTrigger,
    setAggregated,
    setRawEmotions,
    setRawPeople,
    setDataLoaded,
  ]);

  if (loading) {
    return (
      <div className="insights-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Container variant="primary" padding="lg">
        <div className="insights-error">
          <Text variant="muted">{error}</Text>
        </div>
      </Container>
    );
  }

  const filteredEmotions = filterEmotionsBySentiment(
    aggregated?.emotions,
    isMobile ? emotionSentimentFilter : sentimentFilter,
  );
  const filteredPeople = isMobile
    ? aggregated?.people
    : filterPeopleBySentiment(aggregated?.people, sentimentFilter);

  const filteredEmotionEntries = selectedEmotion
    ? rawEmotions.filter(
        (e) => e.emotion.toLowerCase() === selectedEmotion.toLowerCase(),
      )
    : [];

  const filteredPeopleEntries = selectedPerson
    ? rawPeople.filter(
        (p) => p.name.toLowerCase() === selectedPerson.toLowerCase(),
      )
    : [];

  const sentimentOptions: {
    value: SentimentFilter;
    label: string;
    color?: string;
  }[] = [
    { value: "all", label: "All" },
    { value: "positive", label: "Positive", color: sentimentColors.positive },
    { value: "negative", label: "Negative", color: sentimentColors.negative },
    { value: "mixed", label: "Mixed", color: sentimentColors.mixed },
  ];

  const typeOptions: { value: InsightTypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "emotions", label: "Emotions" },
    { value: "people", label: "People" },
  ];

  const renderEmotionsColumn = () => (
    <div>
      <Text className="insights-section-title">Emotions</Text>
      <div className="insights-card-grid">
        {filteredEmotions?.map((e, i) => {
          const isSelected =
            selectedEmotion?.toLowerCase() === e.emotion.toLowerCase();
          return (
            <div
              key={i}
              className={`insights-emotion-card insight-aggregate-card${isSelected ? " insights-emotion-card--selected" : ""}`}
              onClick={() => {
                if (isMobile) hapticSelection();
                setSelectedEmotion(isSelected ? null : e.emotion);
                setSelectedPerson(null);
                setSelectedOccurrenceIndex(null);
              }}
            >
              <div className="insights-emotion-card__header">
                <span className="insights-emotion-card__name">{e.emotion}</span>
                <span className="insights-emotion-card__count">{e.count}x</span>
              </div>
              <div className="insights-emotion-card__intensity">
                <div className="insights-intensity-bars">
                  {Array.from({ length: INTENSITY_BAR_COUNT }, (_, i) => {
                    const fullBars = Math.floor(e.avgIntensity);
                    const partialFill = e.avgIntensity % 1;
                    const isPartial = i === fullBars && partialFill > 0;
                    const isFull = i < fullBars;
                    const sentimentClass = `insights-intensity-bar--filled-${e.sentiment}`;

                    if (isPartial) {
                      return (
                        <div
                          key={i}
                          className="insights-intensity-bar"
                          style={{
                            background: `linear-gradient(to right, var(--insights-intensity-${e.sentiment}) ${partialFill * 100}%, var(--bg-primary) ${partialFill * 100}%)`,
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={i}
                        className={
                          isFull
                            ? `insights-intensity-bar ${sentimentClass}`
                            : "insights-intensity-bar"
                        }
                      />
                    );
                  })}
                </div>
                <span className="insights-intensity-value">
                  {e.avgIntensity}
                </span>
              </div>
            </div>
          );
        })}
        {(!filteredEmotions || filteredEmotions.length === 0) && (
          <Text variant="muted" className="insights-empty-message">
            No emotions found
          </Text>
        )}
      </div>
    </div>
  );

  const renderPeopleColumn = () => (
    <div>
      <Text className="insights-section-title">People</Text>
      <div className="insights-card-grid">
        {filteredPeople?.map((p, i) => {
          const isSelected =
            selectedPerson?.toLowerCase() === p.name.toLowerCase();
          const sentimentColor = getSentimentColor(p.sentiment);
          return (
            <div
              key={i}
              className={`insights-person-card insight-aggregate-card${isSelected ? " insights-person-card--selected" : ""}`}
              onClick={() => {
                if (isMobile) hapticSelection();
                setSelectedPerson(isSelected ? null : p.name);
                setSelectedEmotion(null);
                setSelectedOccurrenceIndex(null);
              }}
            >
              <div className="insights-person-card__info">
                <div className="insights-person-card__name-row person-name-row">
                  <span className="insights-person-card__name person-name">
                    {p.name}
                  </span>
                  {p.relationship && (
                    <span className="insights-person-card__relationship person-relationship">
                      · {p.relationship}
                    </span>
                  )}
                </div>
                <div className="insights-person-card__mentions">
                  {p.mentions} mentions
                </div>
              </div>
              <span
                className="insights-sentiment-badge"
                style={{
                  backgroundColor: `${sentimentColor}18`,
                  color: sentimentColor,
                }}
              >
                {p.sentiment}
              </span>
            </div>
          );
        })}
        {(!filteredPeople || filteredPeople.length === 0) && (
          <Text variant="muted" className="insights-empty-message">
            No people found
          </Text>
        )}
      </div>
    </div>
  );

  const renderDetailSection = () => {
    if (selectedEmotion && filteredEmotionEntries.length > 0) {
      const groupedByYear = groupByYear(filteredEmotionEntries);
      const years = Array.from(groupedByYear.keys());
      const currentYear = new Date().getFullYear();
      let globalIndex = 0;

      return (
        <div className="insights-detail-section">
          <Text className="insights-detail-section__title">
            {selectedEmotion} occurrences ({filteredEmotionEntries.length})
          </Text>
          <div className="insights-year-groups">
            {years.map((year) => {
              const yearEntries = groupedByYear.get(year)!;
              const startIndex = globalIndex;
              globalIndex += yearEntries.length;

              return (
                <div key={year}>
                  <div className="insights-year-header">
                    <span className="insights-year-header__title">
                      {year === currentYear ? "This Year" : year}
                    </span>
                    <span className="insights-year-header__count">
                      {yearEntries.length}{" "}
                      {yearEntries.length === 1 ? "occurrence" : "occurrences"}
                    </span>
                    <div className="insights-year-header__line" />
                  </div>
                  <div
                    className={`insights-detail-grid ${isMobile ? "insights-detail-grid--mobile" : "insights-detail-grid--desktop"}`}
                  >
                    {yearEntries.map((e, i) => {
                      const idx = startIndex + i;
                      const isSelected =
                        selectedOccurrenceIndex === idx && selectedEmotion;
                      const sentimentColor = getSentimentColor(e.sentiment);
                      return (
                        <div
                          key={`${e.entryId}-${idx}`}
                          className={`insights-occurrence-card insight-detail-card${isSelected ? " insights-occurrence-card--selected selected" : ""}`}
                          onClick={() => {
                            if (isMobile) hapticSelection();
                            setSelectedOccurrenceIndex(idx);
                            navigateToEntry(e.entryId, e.source);
                            navigate("/entries");
                          }}
                        >
                          <div className="insights-occurrence-card__header">
                            <span className="insights-occurrence-card__date">
                              {formatDateWithoutYear(e.entryDate)}
                            </span>
                            <div className="insights-occurrence-card__intensity">
                              <div className="insights-occurrence-intensity-bars">
                                {Array.from(
                                  { length: INTENSITY_BAR_COUNT },
                                  (_, idx) => (
                                    <div
                                      key={idx}
                                      className="insights-occurrence-intensity-bar"
                                      style={{
                                        backgroundColor:
                                          idx < e.intensity
                                            ? sentimentColor
                                            : undefined,
                                      }}
                                    />
                                  ),
                                )}
                              </div>
                              <span className="insights-occurrence-card__intensity-value">
                                {e.intensity}
                              </span>
                            </div>
                          </div>
                          <div className="insights-occurrence-card__content">
                            {e.trigger || "No trigger"}
                          </div>
                          <span className="insight-detail-card-tip">
                            Go to occurrence →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedPerson && filteredPeopleEntries.length > 0) {
      const groupedByYear = groupByYear(filteredPeopleEntries);
      const years = Array.from(groupedByYear.keys());
      const currentYear = new Date().getFullYear();
      let globalIndex = 0;

      return (
        <div className="insights-detail-section">
          <Text className="insights-detail-section__title">
            {selectedPerson} occurrences ({filteredPeopleEntries.length})
          </Text>
          <div className="insights-year-groups">
            {years.map((year) => {
              const yearEntries = groupedByYear.get(year)!;
              const startIndex = globalIndex;
              globalIndex += yearEntries.length;

              return (
                <div key={year}>
                  <div className="insights-year-header">
                    <span className="insights-year-header__title">
                      {year === currentYear ? "This Year" : year}
                    </span>
                    <span className="insights-year-header__count">
                      {yearEntries.length}{" "}
                      {yearEntries.length === 1 ? "occurrence" : "occurrences"}
                    </span>
                    <div className="insights-year-header__line" />
                  </div>
                  <div
                    className={`insights-detail-grid ${isMobile ? "insights-detail-grid--mobile" : "insights-detail-grid--desktop"}`}
                  >
                    {yearEntries.map((p, i) => {
                      const idx = startIndex + i;
                      const isSelected =
                        selectedOccurrenceIndex === idx && selectedPerson;
                      const sentimentColor = getSentimentColor(p.sentiment);
                      return (
                        <div
                          key={`${p.entryId}-${idx}`}
                          className={`insights-occurrence-card insights-occurrence-card--person insight-detail-card${isSelected ? " insights-occurrence-card--selected selected" : ""}`}
                          onClick={() => {
                            if (isMobile) hapticSelection();
                            setSelectedOccurrenceIndex(idx);
                            navigateToEntry(p.entryId, p.source);
                            navigate("/entries");
                          }}
                        >
                          <div className="insights-occurrence-card__header insights-occurrence-card__header--person">
                            <span className="insights-occurrence-card__date">
                              {formatDateWithoutYear(p.entryDate)}
                            </span>
                            <span
                              className="insights-person-badge"
                              style={{
                                backgroundColor: `${sentimentColor}18`,
                                color: sentimentColor,
                              }}
                            >
                              {p.sentiment}
                            </span>
                          </div>
                          <div className="insights-occurrence-card__content">
                            {p.context || "No context"}
                          </div>
                          <span className="insight-detail-card-tip">
                            Go to occurrence →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  const showEmotions = typeFilter === "all" || typeFilter === "emotions";
  const showPeople = typeFilter === "all" || typeFilter === "people";

  const visibleColumnCount = [showEmotions, showPeople].filter(Boolean).length;
  const columnClass =
    visibleColumnCount === 2
      ? "insights-columns--two"
      : "insights-columns--one";
  const processingPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;
  const processingDetail = progress
    ? `${progress.processed} of ${progress.total} entries`
    : "";
  const processingErrorCount = progress?.errors.length ?? 0;
  const processingLabel = cancelRequested ? "Stopping analysis" : "Analyzing entries";

  const content = (
    <div
      className={`insights-content${isMobile ? " insights-content--mobile" : ""}`}
    >
      {isMobile && isProcessing && progress && (
        <div className="insights-mobile-processing-inline" role="status" aria-live="polite">
          <div className="insights-mobile-processing-inline__top">
            <Spinner size="sm" />
            <Text className="insights-mobile-processing-inline__label">
              {cancelRequested ? "Stopping" : "Analyzing Entries"}
            </Text>
            <Text className="insights-mobile-processing-inline__count">
              {progress.processed}/{progress.total}
            </Text>
          </div>
          <div className="insights-mobile-processing-inline__bottom">
            <div className="insights-mobile-processing-inline__bar">
              <div
                className="insights-mobile-processing-inline__bar-fill"
                style={{ width: `${processingPercent}%` }}
              />
            </div>
            <Text className="insights-mobile-processing-inline__percent">
              {processingPercent}%
            </Text>
          </div>
        </div>
      )}
      {isMobile ? (
        <div className="insights-filters insights-filters--mobile">
          <div
            ref={filterDropdownRef}
            className="insights-filter-dropdown insights-filter-dropdown--mobile"
          >
            <button
              onClick={() => {
                hapticSelection();
                setShowFilterDropdown(!showFilterDropdown);
              }}
              className={`insights-mobile-chip insights-mobile-chip--time${showFilterDropdown ? " insights-mobile-chip--active" : ""}`}
            >
              {getFilterLabel(timeFilter)}
              <span className="insights-mobile-chip__arrow">▼</span>
            </button>
            {showFilterDropdown && (
              <div className="insights-filter-menu insights-filter-menu--mobile">
                {TIME_FILTER_GROUPS.map((group, gi) => (
                  <div key={gi}>
                    {group.label && (
                      <div
                        className={`insights-filter-group-label${gi > 0 ? " insights-filter-group-label--bordered" : ""}`}
                      >
                        {group.label}
                      </div>
                    )}
                    {group.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          hapticSelection();
                          setTimeFilter(option.value);
                          setShowFilterDropdown(false);
                          resetSelections();
                        }}
                        className={`insights-filter-option${timeFilter === option.value ? " insights-filter-option--active" : ""}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="insights-mobile-filter-group">
            <div className="insights-mobile-filter-group__buttons">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    hapticSelection();
                    setTypeFilter(opt.value);
                    resetSelections();
                  }}
                  className={`insights-mobile-filter-btn${typeFilter === opt.value ? " insights-mobile-filter-btn--active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="insights-mobile-filter-group">
            <div className="insights-mobile-filter-group__buttons">
              {sentimentOptions.map((opt) => {
                const isActive = emotionSentimentFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      hapticSelection();
                      setEmotionSentimentFilter(opt.value);
                      resetSelections();
                    }}
                    className={`insights-mobile-filter-btn${isActive ? " insights-mobile-filter-btn--active" : ""}`}
                    style={
                      isActive && opt.color
                        ? {
                            color: opt.color,
                            backgroundColor: `${opt.color}1A`,
                            borderColor: `${opt.color}80`,
                          }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="insights-filters">
          <div ref={filterDropdownRef} className="insights-filter-dropdown">
            <button
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
              }}
              className="insights-filter-button"
            >
              {getFilterLabel(timeFilter)}
              <span className="insights-filter-button__arrow">▼</span>
            </button>
            {showFilterDropdown && (
              <div className="insights-filter-menu">
                {TIME_FILTER_GROUPS.map((group, gi) => (
                  <div key={gi}>
                    {group.label && (
                      <div
                        className={`insights-filter-group-label${gi > 0 ? " insights-filter-group-label--bordered" : ""}`}
                      >
                        {group.label}
                      </div>
                    )}
                    {group.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTimeFilter(option.value);
                          setShowFilterDropdown(false);
                          resetSelections();
                        }}
                        className={`insights-filter-option${timeFilter === option.value ? " insights-filter-option--active" : ""}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="insights-sentiment-filters">
            {sentimentOptions.map((opt) => {
              const isActive = sentimentFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSentimentFilter(opt.value);
                    resetSelections();
                  }}
                  className={`insights-sentiment-button${isActive ? " insights-sentiment-button--active" : ""}`}
                  style={
                    isActive
                      ? {
                          color: opt.color || undefined,
                          backgroundColor: opt.color ? `${opt.color}15` : undefined,
                        }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="insights-type-filters">
            {typeOptions.map((opt) => {
              const isActive = typeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTypeFilter(opt.value);
                    resetSelections();
                  }}
                  className={`insights-type-button${isActive ? " insights-type-button--active" : ""}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        className={`insights-columns ${columnClass}${isMobile ? " insights-columns--mobile" : ""}`}
      >
        {showEmotions && renderEmotionsColumn()}
        {showPeople && renderPeopleColumn()}
      </div>
      {renderDetailSection()}
    </div>
  );

  if (isMobile) {
    return (
      <div className="insights-page insights-page--mobile">
        <MobilePageHeader title="Insights" />
        <div className="insights-scroll">{content}</div>
      </div>
    );
  }

  return (
    <div className="insights-page">
      <header className="insights-header">
        <Text as="h1" className="insights-header__title">
          Insights
        </Text>
      </header>
      {content}
    </div>
  );
}
