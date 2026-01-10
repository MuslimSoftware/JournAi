import { CSSProperties, useState, useEffect, useCallback } from 'react';
import { IoCheckmarkCircle, IoAlertCircle, IoSync, IoSparkles, IoAnalytics } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Button } from '../themed';
import { getEmbeddingStats, embedAllEntries, type EmbeddingStats } from '../../services/embeddings';
import { getApiKey } from '../../lib/secureStorage';
import { getAnalyticsStats, queueAllEntriesForAnalysis, processAnalyticsQueue } from '../../services/analytics';
import type { AnalyticsStats } from '../../types/analytics';

export default function MemorySection() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyticsProgress, setAnalyticsProgress] = useState({ current: 0, total: 0 });
  const [analyticsResult, setAnalyticsResult] = useState<{ success: number; failed: number } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const embeddingStats = await getEmbeddingStats();
      setStats(embeddingStats);
      const analytics = await getAnalyticsStats();
      setAnalyticsStats(analytics);
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleEmbedAll = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Please configure your OpenAI API key first');
      return;
    }

    setProcessing(true);
    setProgress(null);
    setResult(null);
    setError(null);

    try {
      const embedResult = await embedAllEntries((current, total) => {
        setProgress({ current, total });
      });
      setResult({ success: embedResult.success, failed: embedResult.failed });
      if (embedResult.errors.length > 0) {
        console.error('Embedding errors:', embedResult.errors);
      }
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to embed entries');
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const handleAnalyzeAll = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Please configure your OpenAI API key first');
      return;
    }

    setIsAnalyzing(true);
    setAnalyticsResult(null);
    setError(null);

    try {
      const queued = await queueAllEntriesForAnalysis();
      if (queued > 0) {
        await processAnalyticsQueue((current, total) => {
          setAnalyticsProgress({ current, total });
        });
      }
      const newStats = await getAnalyticsStats();
      setAnalyticsStats(newStats);
      setAnalyticsResult({ success: queued, failed: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze entries');
    } finally {
      setIsAnalyzing(false);
      setAnalyticsProgress({ current: 0, total: 0 });
    }
  };

  const fieldStyle: CSSProperties = {
    marginBottom: '16px',
  };

  const statBoxStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: theme.colors.background.subtle,
    marginBottom: '16px',
  };

  const statRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const statLabelStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: theme.colors.text.secondary,
  };

  const statValueStyle: CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.colors.text.primary,
  };

  const progressBarContainerStyle: CSSProperties = {
    width: '100%',
    height: '6px',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '8px',
  };

  const progressBarStyle: CSSProperties = {
    height: '100%',
    backgroundColor: theme.colors.text.accent,
    borderRadius: '3px',
    transition: 'width 0.3s ease',
    width: progress ? `${(progress.current / progress.total) * 100}%` : '0%',
  };

  const statusStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    marginTop: '12px',
  };

  const hintStyle: CSSProperties = {
    marginTop: '8px',
    fontSize: '0.75rem',
    color: theme.colors.text.muted,
  };

  const embeddedPercentage = stats && stats.totalEntries > 0
    ? Math.round((stats.entriesWithEmbeddings / stats.totalEntries) * 100)
    : 0;

  const unembeddedCount = stats ? stats.totalEntries - stats.entriesWithEmbeddings : 0;

  return (
    <div>
      <Text as="h3" variant="primary" style={{ marginBottom: '16px', fontSize: '1rem' }}>
        Memory & RAG
      </Text>

      <div style={fieldStyle}>
        <Text variant="secondary" style={{ fontSize: '0.8125rem', marginBottom: '12px' }}>
          Your journal entries are processed with AI to enable smart search and personalized responses.
        </Text>
      </div>

      {loading ? (
        <div style={statBoxStyle}>
          <Text variant="muted" style={{ fontSize: '0.8125rem' }}>Loading stats...</Text>
        </div>
      ) : stats ? (
        <div style={statBoxStyle}>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>Total Entries</span>
            <span style={statValueStyle}>{stats.totalEntries}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>Embedded Entries</span>
            <span style={statValueStyle}>
              {stats.entriesWithEmbeddings} ({embeddedPercentage}%)
            </span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>Total Chunks</span>
            <span style={statValueStyle}>{stats.totalChunks}</span>
          </div>
          {unembeddedCount > 0 && (
            <div style={statRowStyle}>
              <span style={{ ...statLabelStyle, color: theme.colors.status.warning }}>
                Pending Embeddings
              </span>
              <span style={{ ...statValueStyle, color: theme.colors.status.warning }}>
                {unembeddedCount}
              </span>
            </div>
          )}
        </div>
      ) : null}

      <div style={fieldStyle}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleEmbedAll}
          disabled={processing || unembeddedCount === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {processing ? (
            <>
              <IoSync size={14} className="spin" /> Processing...
            </>
          ) : (
            <>
              <IoSparkles size={14} /> Embed All Entries
            </>
          )}
        </Button>

        {processing && progress && (
          <div>
            <div style={progressBarContainerStyle}>
              <div style={progressBarStyle} />
            </div>
            <Text variant="muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              Processing {progress.current} of {progress.total} entries...
            </Text>
          </div>
        )}

        {result && (
          <div style={statusStyle}>
            {result.failed === 0 ? (
              <span style={{ color: theme.colors.status.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoCheckmarkCircle size={14} />
                Successfully embedded {result.success} entries
              </span>
            ) : (
              <span style={{ color: theme.colors.status.warning, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoAlertCircle size={14} />
                {result.success} succeeded, {result.failed} failed
              </span>
            )}
          </div>
        )}

        {error && (
          <div style={statusStyle}>
            <span style={{ color: theme.colors.status.error, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IoAlertCircle size={14} />
              {error}
            </span>
          </div>
        )}

        <p style={hintStyle}>
          {unembeddedCount > 0
            ? `${unembeddedCount} entries are not yet embedded. Click the button to process them.`
            : 'All entries are embedded. New entries will be embedded automatically when saved.'}
        </p>
      </div>

      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${theme.colors.border.secondary}` }}>
        <Text as="h4" variant="primary" style={{ marginBottom: '12px', fontSize: '0.9375rem' }}>
          Journal Analytics
        </Text>
        <Text variant="secondary" style={{ fontSize: '0.8125rem', marginBottom: '12px' }}>
          Extract themes, emotions, and patterns from your entries for better insights.
        </Text>

        {analyticsStats && (
          <div style={statBoxStyle}>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Entries Analyzed</span>
              <span style={statValueStyle}>{analyticsStats.entriesAnalyzed}</span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Total Insights</span>
              <span style={statValueStyle}>{analyticsStats.totalInsights}</span>
            </div>
            {analyticsStats.entriesPending > 0 && (
              <div style={statRowStyle}>
                <span style={{ ...statLabelStyle, color: theme.colors.status.warning }}>
                  Pending Analysis
                </span>
                <span style={{ ...statValueStyle, color: theme.colors.status.warning }}>
                  {analyticsStats.entriesPending}
                </span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleAnalyzeAll}
          disabled={isAnalyzing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {isAnalyzing ? (
            <>
              <IoSync size={14} className="spin" /> Analyzing...
            </>
          ) : (
            <>
              <IoAnalytics size={14} /> Analyze All Entries
            </>
          )}
        </Button>

        {isAnalyzing && analyticsProgress.total > 0 && (
          <div>
            <div style={progressBarContainerStyle}>
              <div style={{ ...progressBarStyle, width: `${(analyticsProgress.current / analyticsProgress.total) * 100}%` }} />
            </div>
            <Text variant="muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              Analyzing {analyticsProgress.current} of {analyticsProgress.total} entries...
            </Text>
          </div>
        )}

        {analyticsResult && (
          <div style={statusStyle}>
            <span style={{ color: theme.colors.status.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IoCheckmarkCircle size={14} />
              Successfully analyzed {analyticsResult.success} entries
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
