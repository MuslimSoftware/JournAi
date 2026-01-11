import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSettingsOutline } from 'react-icons/io5';
import { Container, Text, Spinner } from '../components/themed';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useInsights } from '../contexts/InsightsContext';
import { useEntryNavigation } from '../contexts/EntryNavigationContext';
import {
  getAggregatedInsights,
  getRawEmotionInsights,
  getRawPersonInsights,
} from '../services/analytics';
import { parseLocalDate } from '../utils/date';
import '../styles/insights.css';

const INTENSITY_COLORS = {
  positive: '#22C55E',
  negative: '#EF4444',
  neutral: '#6B7280',
};

type TimeFilter =
  | 'last7' | 'last30' | 'last90'
  | 'thisWeek' | 'lastWeek'
  | 'thisMonth' | 'lastMonth'
  | 'thisYear' | 'lastYear'
  | 'all';

interface TimeFilterGroup {
  label: string;
  options: { value: TimeFilter; label: string }[];
}

const TIME_FILTER_GROUPS: TimeFilterGroup[] = [
  {
    label: 'Rolling',
    options: [
      { value: 'last7', label: 'Last 7 Days' },
      { value: 'last30', label: 'Last 30 Days' },
      { value: 'last90', label: 'Last 90 Days' },
    ],
  },
  {
    label: 'Weekly',
    options: [
      { value: 'thisWeek', label: 'This Week' },
      { value: 'lastWeek', label: 'Last Week' },
    ],
  },
  {
    label: 'Monthly',
    options: [
      { value: 'thisMonth', label: 'This Month' },
      { value: 'lastMonth', label: 'Last Month' },
    ],
  },
  {
    label: 'Yearly',
    options: [
      { value: 'thisYear', label: 'This Year' },
      { value: 'lastYear', label: 'Last Year' },
    ],
  },
  {
    label: '',
    options: [
      { value: 'all', label: 'All Time' },
    ],
  },
];

function getFilterLabel(filter: TimeFilter): string {
  for (const group of TIME_FILTER_GROUPS) {
    const option = group.options.find(o => o.value === filter);
    if (option) return option.label;
  }
  return 'Select';
}

function getDateRange(filter: TimeFilter): { start: string; end: string } | null {
  if (filter === 'all') return null;

  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: Date;

  switch (filter) {
    case 'last7': {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    }
    case 'last30': {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      break;
    }
    case 'last90': {
      start = new Date(now);
      start.setDate(now.getDate() - 90);
      break;
    }
    case 'thisWeek': {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      break;
    }
    case 'lastWeek': {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + 6);
      return { start: start.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
    }
    case 'thisMonth': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'lastMonth': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: start.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
    }
    case 'thisYear': {
      start = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case 'lastYear': {
      start = new Date(now.getFullYear() - 1, 0, 1);
      const endDate = new Date(now.getFullYear() - 1, 11, 31);
      return { start: start.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
    }
  }

  return { start: start.toISOString().split('T')[0], end };
}

function getSolidColor(sentiment: string): string {
  const colors: Record<string, string> = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
    mixed: '#f59e0b',
    tense: '#ef4444',
  };
  return colors[sentiment] || colors.neutral;
}

function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Insights() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { openSettings } = useSettings();
  const { theme } = useTheme();
  const { navigateToEntry } = useEntryNavigation();
  const {
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
  } = useInsights();

  const [loading, setLoading] = useState(!dataLoaded);
  const [error, setError] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const lastLoadedFilter = useRef<string | null>(dataLoaded ? timeFilter : null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterDropdown]);

  const loadData = async (filter: TimeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const range = getDateRange(filter);
      const [agg, emotions, people] = await Promise.all([
        getAggregatedInsights(range?.start, range?.end),
        getRawEmotionInsights(500, range?.start, range?.end),
        getRawPersonInsights(500, range?.start, range?.end),
      ]);
      setAggregated(agg);
      setRawEmotions(emotions);
      setRawPeople(people);
      setDataLoaded(true);
      lastLoadedFilter.current = filter;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lastLoadedFilter.current !== timeFilter) {
      loadData(timeFilter);
    }
  }, [timeFilter]);

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '12px 16px' : '0 0 16px',
    minHeight: isMobile ? '56px' : undefined,
  };

  const iconButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '8px',
    color: theme.colors.text.muted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentStyle: CSSProperties = {
    padding: isMobile ? '0 16px 100px' : '0',
  };

  if (loading) {
    return (
      <div style={{ height: '100%', backgroundColor: theme.colors.background.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Container variant="primary" padding="lg">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text variant="muted">{error}</Text>
        </div>
      </Container>
    );
  }

  const filteredEmotions = sentimentFilter === 'all'
    ? aggregated?.emotions
    : aggregated?.emotions.filter(e => {
        if (sentimentFilter === 'mixed') return e.sentiment === 'neutral';
        return e.sentiment === sentimentFilter;
      });

  const filteredPeople = sentimentFilter === 'all'
    ? aggregated?.people
    : aggregated?.people.filter(p => {
        if (sentimentFilter === 'mixed') return p.sentiment === 'mixed' || p.sentiment === 'tense';
        if (sentimentFilter === 'negative') return p.sentiment === 'negative' || p.sentiment === 'tense';
        return p.sentiment === sentimentFilter;
      });

  const filteredEmotionEntries = selectedEmotion
    ? rawEmotions.filter(e => e.emotion.toLowerCase() === selectedEmotion.toLowerCase())
    : [];

  const filteredPeopleEntries = selectedPerson
    ? rawPeople.filter(p => p.name.toLowerCase() === selectedPerson.toLowerCase())
    : [];

  const renderEmotionsColumn = () => (
    <div>
      <Text style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: theme.colors.text.muted,
        marginBottom: '12px',
        display: 'block',
      }}>
        Emotions
      </Text>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '6px',
      }}>
        {filteredEmotions?.map((e, i) => {
          const isSelected = selectedEmotion?.toLowerCase() === e.emotion.toLowerCase();
          const barColor = INTENSITY_COLORS[e.sentiment] || INTENSITY_COLORS.neutral;
          return (
            <div
              key={i}
              className="insight-aggregate-card"
              onClick={() => {
                setSelectedEmotion(isSelected ? null : e.emotion);
                setSelectedPerson(null);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${isSelected ? theme.colors.text.primary : theme.colors.border.primary}`,
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: theme.colors.text.primary,
                  textTransform: 'capitalize',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {e.emotion}
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  color: theme.colors.text.muted,
                  marginLeft: '4px',
                  flexShrink: 0,
                }}>
                  {e.count}x
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  gap: '2px',
                }}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '8px',
                        borderRadius: '2px',
                        backgroundColor: i < e.avgIntensity
                          ? barColor
                          : theme.colors.background.primary,
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: theme.colors.text.muted,
                }}>
                  {e.avgIntensity}
                </span>
              </div>
            </div>
          );
        })}
        {(!filteredEmotions || filteredEmotions.length === 0) && (
          <Text variant="muted" style={{ fontSize: '0.85rem', padding: '20px 0' }}>No emotions found</Text>
        )}
      </div>
    </div>
  );

  const renderPeopleColumn = () => (
    <div>
      <Text style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: theme.colors.text.muted,
        marginBottom: '12px',
        display: 'block',
      }}>
        People
      </Text>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '6px',
      }}>
        {filteredPeople?.map((p, i) => {
          const isSelected = selectedPerson?.toLowerCase() === p.name.toLowerCase();
          return (
            <div
              key={i}
              className="insight-aggregate-card"
              onClick={() => {
                setSelectedPerson(isSelected ? null : p.name);
                setSelectedEmotion(null);
              }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${isSelected ? theme.colors.text.primary : theme.colors.border.primary}`,
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '52px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                  className="person-name-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '2px',
                    minWidth: 0,
                  }}
                >
                  <span
                    className="person-name"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      textTransform: 'capitalize',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: '0 1 auto',
                    }}
                  >
                    {p.name}
                  </span>
                  {p.relationship && (
                    <span
                      className="person-relationship"
                      style={{
                        fontSize: '0.7rem',
                        color: theme.colors.text.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      · {p.relationship}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: theme.colors.text.muted,
                }}>
                  {p.mentions} mentions
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: `${getSolidColor(p.sentiment)}18`,
                color: getSolidColor(p.sentiment),
                fontWeight: 600,
                textTransform: 'capitalize',
                flexShrink: 0,
              }}>
                {p.sentiment}
              </span>
            </div>
          );
        })}
        {(!filteredPeople || filteredPeople.length === 0) && (
          <Text variant="muted" style={{ fontSize: '0.85rem', padding: '20px 0' }}>No people found</Text>
        )}
      </div>
    </div>
  );

  const renderDetailSection = () => {
    if (selectedEmotion && filteredEmotionEntries.length > 0) {
      return (
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${theme.colors.border.primary}` }}>
          <Text style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: theme.colors.text.muted,
            marginBottom: '12px',
            display: 'block',
          }}>
            {selectedEmotion} occurrences ({filteredEmotionEntries.length})
          </Text>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '8px',
          }}>
            {filteredEmotionEntries.map((e, i) => (
              <div
                key={`${e.entryId}-${i}`}
                onClick={() => { console.log('Emotion entry:', e); navigateToEntry(e.entryId, e.source ? { start: e.source.start, end: e.source.end } : undefined); navigate('/entries'); }}
                style={{
                  padding: '12px',
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${theme.colors.border.primary}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  minHeight: '100px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: theme.colors.text.muted,
                  }}>
                    {formatDate(e.entryDate)}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '2px',
                    }}>
                      {Array.from({ length: 10 }, (_, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '1.5px',
                            backgroundColor: idx < e.intensity
                              ? getSolidColor(e.sentiment)
                              : theme.colors.background.primary,
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: theme.colors.text.muted }}>
                      {e.intensity}
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: theme.colors.text.secondary,
                  lineHeight: '1.45',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  flex: 1,
                }}>
                  {e.trigger || 'No trigger'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (selectedPerson && filteredPeopleEntries.length > 0) {
      return (
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${theme.colors.border.primary}` }}>
          <Text style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: theme.colors.text.muted,
            marginBottom: '12px',
            display: 'block',
          }}>
            {selectedPerson} occurrences ({filteredPeopleEntries.length})
          </Text>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '8px',
          }}>
            {filteredPeopleEntries.map((p, i) => (
              <div
                key={`${p.entryId}-${i}`}
                onClick={() => { navigateToEntry(p.entryId, p.source ? { start: p.source.start, end: p.source.end } : undefined); navigate('/entries'); }}
                style={{
                  padding: '14px',
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${theme.colors.border.primary}`,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '120px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: theme.colors.text.muted,
                  }}>
                    {formatDate(p.entryDate)}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: `${getSolidColor(p.sentiment)}18`,
                    color: getSolidColor(p.sentiment),
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>
                    {p.sentiment}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: theme.colors.text.secondary,
                  lineHeight: '1.45',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  flex: 1,
                }}>
                  {p.context || 'No context'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const sentimentOptions: { value: 'all' | 'positive' | 'negative' | 'mixed'; label: string; color?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'positive', label: 'Positive', color: '#10b981' },
    { value: 'negative', label: 'Negative', color: '#ef4444' },
    { value: 'mixed', label: 'Mixed', color: '#f59e0b' },
  ];

  const content = (
    <div style={contentStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div ref={filterDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {getFilterLabel(timeFilter)}
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>▼</span>
          </button>
        {showFilterDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: theme.colors.background.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              minWidth: '160px',
              overflow: 'hidden',
            }}
          >
            {TIME_FILTER_GROUPS.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div style={{
                    padding: '6px 12px 4px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: theme.colors.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderTop: gi > 0 ? `1px solid ${theme.colors.border.primary}` : 'none',
                  }}>
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
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: timeFilter === option.value ? 600 : 400,
                      color: timeFilter === option.value ? theme.colors.text.primary : theme.colors.text.secondary,
                      backgroundColor: timeFilter === option.value ? theme.colors.background.primary : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {sentimentOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSentimentFilter(opt.value);
                resetSelections();
              }}
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: sentimentFilter === opt.value ? 600 : 400,
                color: sentimentFilter === opt.value
                  ? (opt.color || theme.colors.text.primary)
                  : theme.colors.text.muted,
                backgroundColor: sentimentFilter === opt.value
                  ? (opt.color ? `${opt.color}15` : theme.colors.background.secondary)
                  : 'transparent',
                border: `1px solid ${sentimentFilter === opt.value
                  ? (opt.color || theme.colors.border.primary)
                  : 'transparent'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '24px',
      }}>
        {renderEmotionsColumn()}
        {renderPeopleColumn()}
      </div>
      {renderDetailSection()}
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ height: '100%', backgroundColor: theme.colors.background.primary, overflowY: 'auto' }}>
        <header style={headerStyle}>
          <Text style={{ fontSize: '1.5rem', fontWeight: 700 }}>Insights</Text>
          <button onClick={openSettings} style={iconButtonStyle} aria-label="Settings">
            <IoSettingsOutline size={22} />
          </button>
        </header>
        {content}
      </div>
    );
  }

  return (
    <Container variant="primary" padding="lg" style={{ height: '100%', overflowY: 'auto' }}>
      <header style={headerStyle}>
        <Text as="h1" style={{ margin: 0 }}>Insights</Text>
      </header>
      {content}
    </Container>
  );
}
