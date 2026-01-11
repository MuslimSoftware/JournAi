import { CSSProperties, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSettingsOutline, IoSparkles, IoHeart, IoPeople, IoTrophy, IoRefresh, IoClose, IoChevronForward } from 'react-icons/io5';
import { Container, Text, Card, Spinner } from '../components/themed';
import Modal from '../components/Modal';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAggregatedInsights, getAnalyticsStats, getEmotionOccurrences, getPersonOccurrences, type EmotionOccurrence, type PersonOccurrence } from '../services/analytics';
import { parseLocalDate } from '../utils/date';
import type { AggregatedInsights, AnalyticsStats, RelationshipSentiment } from '../types/analytics';
import '../styles/insights.css';

type InsightCategory = 'emotions' | 'people';

const categoryConfig: Record<InsightCategory, { icon: typeof IoSparkles; label: string; color: string }> = {
  emotions: { icon: IoHeart, label: 'Emotions', color: '#ec4899' },
  people: { icon: IoPeople, label: 'People', color: '#3b82f6' },
};

function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getSentimentColor(sentiment: string, theme: ReturnType<typeof useTheme>['theme']): string {
  if (sentiment === 'positive') return theme.colors.status.success;
  if (sentiment === 'negative' || sentiment === 'tense') return theme.colors.status.error;
  if (sentiment === 'mixed') return theme.colors.status.warning;
  return theme.colors.text.muted;
}

function getIntensityColor(intensity: number, theme: ReturnType<typeof useTheme>['theme']): string {
  if (intensity <= 3) return theme.colors.status.success;
  if (intensity <= 6) return theme.colors.status.warning;
  return theme.colors.status.error;
}

function IntensityBar({ intensity, theme }: { intensity: number; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '40px',
        height: '4px',
        backgroundColor: theme.colors.background.secondary,
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${intensity * 10}%`,
          height: '100%',
          backgroundColor: getIntensityColor(intensity, theme),
          borderRadius: '2px',
        }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: theme.colors.text.muted }}>{intensity}</span>
    </div>
  );
}

function EmotionDetailModal({
  emotion,
  occurrences,
  onClose,
  onEntryClick,
  theme,
}: {
  emotion: string;
  occurrences: EmotionOccurrence[];
  onClose: () => void;
  onEntryClick: (entryId: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <Modal isOpen onClose={onClose} size="md">
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IoHeart size={24} color="#ec4899" />
            <Text as="h2" style={{ margin: 0, textTransform: 'capitalize' }}>{emotion}</Text>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: theme.colors.text.muted,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IoClose size={24} />
          </button>
        </div>
        <Text variant="muted" style={{ marginBottom: '16px', display: 'block' }}>
          {occurrences.length} occurrence{occurrences.length !== 1 ? 's' : ''} recorded
        </Text>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {occurrences.map((occ, i) => (
            <div
              key={`${occ.entryId}-${i}`}
              onClick={() => onEntryClick(occ.entryId)}
              style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: theme.colors.background.subtle,
                border: `1px solid ${theme.colors.border.secondary}`,
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.subtle}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatDate(occ.entryDate)}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: `${getIntensityColor(occ.intensity, theme)}20`,
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: getIntensityColor(occ.intensity, theme) }}>
                      {occ.intensity}/10
                    </span>
                  </div>
                  <IoChevronForward size={16} color={theme.colors.text.muted} />
                </div>
              </div>
              {occ.trigger && (
                <Text variant="muted" style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'block' }}>
                  {occ.trigger}
                </Text>
              )}
              {!occ.trigger && (
                <Text variant="muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                  No trigger recorded
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function PersonDetailModal({
  name,
  relationship,
  occurrences,
  onClose,
  onEntryClick,
  theme,
}: {
  name: string;
  relationship?: string;
  occurrences: PersonOccurrence[];
  onClose: () => void;
  onEntryClick: (entryId: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <Modal isOpen onClose={onClose} size="md">
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IoPeople size={24} color="#3b82f6" />
            <div>
              <Text as="h2" style={{ margin: 0, textTransform: 'capitalize' }}>{name}</Text>
              {relationship && (
                <Text variant="muted" style={{ fontSize: '0.85rem' }}>{relationship}</Text>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: theme.colors.text.muted,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IoClose size={24} />
          </button>
        </div>
        <Text variant="muted" style={{ marginBottom: '16px', display: 'block' }}>
          {occurrences.length} mention{occurrences.length !== 1 ? 's' : ''} recorded
        </Text>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {occurrences.map((occ, i) => (
            <div
              key={`${occ.entryId}-${i}`}
              onClick={() => onEntryClick(occ.entryId)}
              style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: theme.colors.background.subtle,
                border: `1px solid ${theme.colors.border.secondary}`,
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.subtle}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatDate(occ.entryDate)}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: `${getSentimentColor(occ.sentiment, theme)}20`,
                    color: getSentimentColor(occ.sentiment, theme),
                    textTransform: 'capitalize',
                    fontWeight: 600,
                  }}>
                    {occ.sentiment}
                  </div>
                  <IoChevronForward size={16} color={theme.colors.text.muted} />
                </div>
              </div>
              {occ.context && (
                <Text variant="muted" style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'block' }}>
                  {occ.context}
                </Text>
              )}
              {!occ.context && (
                <Text variant="muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                  No context recorded
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function EmotionCard({ emotion, avgIntensity, count, triggers, sentiment, theme, onClick }: {
  emotion: string;
  avgIntensity: number;
  count: number;
  triggers: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  theme: ReturnType<typeof useTheme>['theme'];
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: theme.colors.background.subtle,
        border: `1px solid ${theme.colors.border.secondary}`,
        minWidth: '200px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.background.subtle;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, color: getSentimentColor(sentiment, theme), textTransform: 'capitalize' }}>
          {emotion}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: theme.colors.text.muted }}>{count}x</span>
          <IoChevronForward size={14} color={theme.colors.text.muted} />
        </div>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: theme.colors.text.muted }}>Avg intensity: </span>
        <IntensityBar intensity={avgIntensity} theme={theme} />
      </div>
      {triggers.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: theme.colors.text.muted }}>
          <span>Triggers: </span>
          <span style={{ color: theme.colors.text.secondary }}>{triggers.join(', ')}</span>
        </div>
      )}
    </div>
  );
}

function PersonCard({ name, relationship, sentiment, mentions, recentContext, theme, onClick }: {
  name: string;
  relationship?: string;
  sentiment: RelationshipSentiment;
  mentions: number;
  recentContext?: string;
  theme: ReturnType<typeof useTheme>['theme'];
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: theme.colors.background.subtle,
        border: `1px solid ${theme.colors.border.secondary}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.background.subtle;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{name}</span>
          {relationship && (
            <span style={{ fontSize: '0.75rem', color: theme.colors.text.muted, marginLeft: '6px' }}>
              ({relationship})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: theme.colors.text.muted }}>{mentions}x</span>
          <IoChevronForward size={14} color={theme.colors.text.muted} />
        </div>
      </div>
      <div style={{
        fontSize: '0.7rem',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: `${getSentimentColor(sentiment, theme)}20`,
        color: getSentimentColor(sentiment, theme),
        display: 'inline-block',
        textTransform: 'capitalize',
        marginBottom: recentContext ? '6px' : 0,
      }}>
        {sentiment}
      </div>
      {recentContext && (
        <div style={{ fontSize: '0.75rem', color: theme.colors.text.muted, marginTop: '4px' }}>
          {recentContext}
        </div>
      )}
    </div>
  );
}

function InsightSection({
  category,
  data,
  theme,
  onEmotionClick,
  onPersonClick,
}: {
  category: InsightCategory;
  data: AggregatedInsights;
  theme: ReturnType<typeof useTheme>['theme'];
  onEmotionClick?: (emotion: string) => void;
  onPersonClick?: (name: string, relationship?: string) => void;
}) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  const items = data[category];

  if (!items || items.length === 0) return null;

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  };

  const gridContainerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  };

  const renderItems = () => {
    switch (category) {
      case 'emotions':
        return (
          <div style={gridContainerStyle}>
            {data.emotions.map((e, i) => (
              <EmotionCard
                key={i}
                emotion={e.emotion}
                avgIntensity={e.avgIntensity}
                count={e.count}
                triggers={e.triggers}
                sentiment={e.sentiment}
                theme={theme}
                onClick={() => onEmotionClick?.(e.emotion)}
              />
            ))}
          </div>
        );
      case 'people':
        return (
          <div style={gridContainerStyle}>
            {data.people.map((p, i) => (
              <PersonCard
                key={i}
                name={p.name}
                relationship={p.relationship}
                sentiment={p.sentiment}
                mentions={p.mentions}
                recentContext={p.recentContext}
                theme={theme}
                onClick={() => onPersonClick?.(p.name, p.relationship)}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <Card padding="md" style={{ marginBottom: '16px' }}>
      <div style={headerStyle}>
        <Icon size={20} color={config.color} />
        <Text as="h3" style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{config.label}</Text>
        <Text variant="muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
          {items.length} {items.length === 1 ? 'insight' : 'insights'}
        </Text>
      </div>
      {renderItems()}
    </Card>
  );
}

function StatsCard({ stats, theme }: { stats: AnalyticsStats; theme: ReturnType<typeof useTheme>['theme'] }) {
  const statItems = [
    { label: 'Total Insights', value: stats.totalInsights, icon: IoSparkles },
    { label: 'Entries Analyzed', value: stats.entriesAnalyzed, icon: IoTrophy },
  ];

  return (
    <Card padding="md" style={{ marginBottom: '20px' }}>
      <div className="insights-stats-grid">
        {statItems.map((item, i) => (
          <div key={i} className="insights-stat-item">
            <item.icon size={24} color={theme.colors.text.accent} />
            <div>
              <Text as="h4" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                {item.value}
              </Text>
              <Text variant="muted" style={{ fontSize: '0.8rem' }}>{item.label}</Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyState({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <Card padding="lg" style={{ textAlign: 'center', marginTop: '40px' }}>
      <IoSparkles size={48} color={theme.colors.text.muted} style={{ marginBottom: '16px' }} />
      <Text as="h3" style={{ margin: '0 0 8px' }}>No Insights Yet</Text>
      <Text variant="muted" style={{ maxWidth: '300px', margin: '0 auto' }}>
        Write more journal entries to discover insights about your emotions and relationships.
      </Text>
    </Card>
  );
}

export default function Insights() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { openSettings } = useSettings();
  const { theme } = useTheme();

  const [insights, setInsights] = useState<AggregatedInsights | null>(null);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [emotionOccurrences, setEmotionOccurrences] = useState<EmotionOccurrence[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; relationship?: string } | null>(null);
  const [personOccurrences, setPersonOccurrences] = useState<PersonOccurrence[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [insightsData, statsData] = await Promise.all([
        getAggregatedInsights(),
        getAnalyticsStats(),
      ]);
      setInsights(insightsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const handleEmotionClick = async (emotion: string) => {
    setSelectedEmotion(emotion);
    setLoadingOccurrences(true);
    try {
      const occurrences = await getEmotionOccurrences(emotion);
      setEmotionOccurrences(occurrences);
    } catch (err) {
      console.error('Failed to load emotion occurrences:', err);
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const handlePersonClick = async (name: string, relationship?: string) => {
    setSelectedPerson({ name, relationship });
    setLoadingOccurrences(true);
    try {
      const occurrences = await getPersonOccurrences(name);
      setPersonOccurrences(occurrences);
    } catch (err) {
      console.error('Failed to load person occurrences:', err);
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const handleEntryClick = (entryId: string) => {
    setSelectedEmotion(null);
    setSelectedPerson(null);
    navigate(`/entries?id=${entryId}`);
  };

  const closeModal = () => {
    setSelectedEmotion(null);
    setEmotionOccurrences([]);
    setSelectedPerson(null);
    setPersonOccurrences([]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasInsights = stats && stats.totalInsights > 0;

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '12px 16px' : '0 0 24px',
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

  const refreshButtonStyle: CSSProperties = {
    ...iconButtonStyle,
    marginRight: isMobile ? '8px' : '0',
  };

  const contentContainerStyle: CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: isMobile ? '0 16px 100px' : '0',
  };

  if (loading) {
    return (
      <div style={{
        height: '100%',
        backgroundColor: theme.colors.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Container variant="primary" padding="lg">
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <Text variant="muted">{error}</Text>
          <button onClick={loadData} style={{ ...iconButtonStyle, marginTop: '16px' }}>
            <IoRefresh size={20} /> Retry
          </button>
        </Card>
      </Container>
    );
  }

  const renderContent = () => (
    <>
      {stats && <StatsCard stats={stats} theme={theme} />}
      {insights && (
        <>
          <InsightSection category="emotions" data={insights} theme={theme} onEmotionClick={handleEmotionClick} />
          <InsightSection category="people" data={insights} theme={theme} onPersonClick={handlePersonClick} />
        </>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div style={{ height: '100%', backgroundColor: theme.colors.background.primary, overflowY: 'auto' }}>
        <header style={headerStyle}>
          <Text style={{ fontSize: '1.5rem', fontWeight: 700 }}>Insights</Text>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={loadData} style={refreshButtonStyle} aria-label="Refresh">
              <IoRefresh size={22} />
            </button>
            <button onClick={openSettings} style={iconButtonStyle} aria-label="Settings">
              <IoSettingsOutline size={22} />
            </button>
          </div>
        </header>
        <div style={contentContainerStyle}>
          {!hasInsights ? <EmptyState theme={theme} /> : renderContent()}
        </div>
        {selectedEmotion && !loadingOccurrences && (
          <EmotionDetailModal
            emotion={selectedEmotion}
            occurrences={emotionOccurrences}
            onClose={closeModal}
            onEntryClick={handleEntryClick}
            theme={theme}
          />
        )}
        {selectedPerson && !loadingOccurrences && (
          <PersonDetailModal
            name={selectedPerson.name}
            relationship={selectedPerson.relationship}
            occurrences={personOccurrences}
            onClose={closeModal}
            onEntryClick={handleEntryClick}
            theme={theme}
          />
        )}
      </div>
    );
  }

  return (
    <Container variant="primary" padding="lg" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={contentContainerStyle}>
        <header style={headerStyle}>
          <Text as="h1" style={{ margin: 0 }}>Insights</Text>
          <button onClick={loadData} style={iconButtonStyle} aria-label="Refresh">
            <IoRefresh size={20} />
          </button>
        </header>
        {!hasInsights ? <EmptyState theme={theme} /> : renderContent()}
      </div>
      {selectedEmotion && !loadingOccurrences && (
        <EmotionDetailModal
          emotion={selectedEmotion}
          occurrences={emotionOccurrences}
          onClose={closeModal}
          onEntryClick={handleEntryClick}
          theme={theme}
        />
      )}
      {selectedPerson && !loadingOccurrences && (
        <PersonDetailModal
          name={selectedPerson.name}
          relationship={selectedPerson.relationship}
          occurrences={personOccurrences}
          onClose={closeModal}
          onEntryClick={handleEntryClick}
          theme={theme}
        />
      )}
    </Container>
  );
}
