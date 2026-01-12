import { CSSProperties, useState, useEffect, useCallback, useRef } from 'react';
import { IoCheckmarkCircle, IoAlertCircle, IoSync, IoSparkles, IoAnalytics, IoTrash, IoClose } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Button } from '../themed';
import Modal from '../Modal';
import '../../styles/themed.css';
import { getEmbeddingStats, embedAllEntries, clearAllEmbeddings, type EmbeddingStats } from '../../services/embeddings';
import { getApiKey } from '../../lib/secureStorage';
import { getAnalyticsStats, queueAllEntriesForAnalysis, processAnalyticsQueue, clearAllInsights, getFailedAnalysisEntries, retryFailedEntry, dismissFailedEntry, type FailedAnalysisEntry } from '../../services/analytics';
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
  const [clearingEmbeddings, setClearingEmbeddings] = useState(false);
  const [clearingInsights, setClearingInsights] = useState(false);
  const [confirmingClearEmbeddings, setConfirmingClearEmbeddings] = useState(false);
  const [confirmingClearInsights, setConfirmingClearInsights] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [failedEntries, setFailedEntries] = useState<FailedAnalysisEntry[]>([]);
  const analyzeAbortController = useRef<AbortController | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const embeddingStats = await getEmbeddingStats();
      setStats(embeddingStats);
      const analytics = await getAnalyticsStats();
      setAnalyticsStats(analytics);
      const failed = await getFailedAnalysisEntries();
      setFailedEntries(failed);
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
      const embedResult = await embedAllEntries((current, total, _entryId, chunkCount) => {
        setProgress({ current, total });
        if (chunkCount !== undefined && chunkCount > 0) {
          setStats(prev => prev ? {
            ...prev,
            entriesWithEmbeddings: prev.entriesWithEmbeddings + 1,
            totalChunks: prev.totalChunks + chunkCount,
          } : prev);
        }
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

    analyzeAbortController.current = new AbortController();
    setAnalyticsResult(null);
    setError(null);

    try {
      await queueAllEntriesForAnalysis();
      const stats = await getAnalyticsStats();
      setAnalyticsStats(stats);
      if (stats.entriesPending > 0) {
        setIsAnalyzing(true);
        setAnalyticsProgress({ current: 0, total: stats.entriesPending });
        const result = await processAnalyticsQueue((current, total, insightCount) => {
          setAnalyticsProgress({ current, total });
          if (insightCount !== undefined) {
            setAnalyticsStats(prev => prev ? {
              ...prev,
              entriesAnalyzed: prev.entriesAnalyzed + 1,
              totalInsights: prev.totalInsights + insightCount,
              entriesPending: Math.max(0, prev.entriesPending - 1),
            } : prev);
          }
        }, analyzeAbortController.current.signal);
        if (!result.cancelled) {
          setAnalyticsResult({ success: result.success, failed: result.failed });
        }
      }
      const newStats = await getAnalyticsStats();
      setAnalyticsStats(newStats);
      const failed = await getFailedAnalysisEntries();
      setFailedEntries(failed);
    } catch (err) {
      if (!analyzeAbortController.current?.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to analyze entries');
      }
    } finally {
      setIsAnalyzing(false);
      setIsCancelling(false);
      setAnalyticsProgress({ current: 0, total: 0 });
      analyzeAbortController.current = null;
    }
  };

  const handleCancelAnalysis = () => {
    setIsCancelling(true);
    analyzeAbortController.current?.abort();
  };

  const handleRetryFailed = async (queueId: string) => {
    await retryFailedEntry(queueId);
    await loadStats();
  };

  const handleDismissFailed = async (queueId: string) => {
    await dismissFailedEntry(queueId);
    await loadStats();
  };

  const handleClearEmbeddings = async () => {
    setClearingEmbeddings(true);
    setConfirmingClearEmbeddings(false);
    setError(null);
    try {
      await clearAllEmbeddings();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear embeddings');
    } finally {
      setClearingEmbeddings(false);
    }
  };

  const handleClearInsights = async () => {
    setClearingInsights(true);
    setConfirmingClearInsights(false);
    setError(null);
    setAnalyticsResult(null);
    try {
      await clearAllInsights();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear insights');
    } finally {
      setClearingInsights(false);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          {stats && stats.entriesWithEmbeddings > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingClearEmbeddings(true)}
              disabled={clearingEmbeddings || processing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: theme.colors.status.error,
                color: theme.colors.status.error,
              }}
            >
              {clearingEmbeddings ? (
                <>
                  <IoSync size={14} className="spin" /> Clearing...
                </>
              ) : (
                <>
                  <IoTrash size={14} /> Clear
                </>
              )}
            </Button>
          )}
        </div>

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
              <span style={statLabelStyle}>Entries Processed</span>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          {analyticsStats && analyticsStats.totalInsights > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingClearInsights(true)}
              disabled={clearingInsights || isAnalyzing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: theme.colors.status.error,
                color: theme.colors.status.error,
              }}
            >
              {clearingInsights ? (
                <>
                  <IoSync size={14} className="spin" /> Clearing...
                </>
              ) : (
                <>
                  <IoTrash size={14} /> Clear
                </>
              )}
            </Button>
          )}
        </div>

        {isAnalyzing && (
          <div>
            <div style={progressBarContainerStyle}>
              <div style={{
                ...progressBarStyle,
                width: analyticsProgress.total > 0
                  ? `${(analyticsProgress.current / analyticsProgress.total) * 100}%`
                  : '30%',
                ...(analyticsProgress.total === 0 && {
                  animation: 'pulse 1.5s ease-in-out infinite',
                })
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <Text variant="muted" style={{ fontSize: '0.75rem' }}>
                {analyticsProgress.total > 0
                  ? `Analyzing ${analyticsProgress.current} of ${analyticsProgress.total} entries...`
                  : 'Queuing entries...'}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelAnalysis}
                disabled={isCancelling}
                style={{
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isCancelling ? (
                  <><IoSync size={12} className="spin" /> Cancelling...</>
                ) : (
                  <><IoClose size={12} /> Cancel</>
                )}
              </Button>
            </div>
          </div>
        )}

        {analyticsResult && (
          <div style={statusStyle}>
            {analyticsResult.failed === 0 ? (
              <span style={{ color: theme.colors.status.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoCheckmarkCircle size={14} />
                Successfully analyzed {analyticsResult.success} entries
              </span>
            ) : (
              <span style={{ color: theme.colors.status.warning, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoAlertCircle size={14} />
                {analyticsResult.success} succeeded, {analyticsResult.failed} failed
              </span>
            )}
          </div>
        )}

        {failedEntries.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Text variant="secondary" style={{ fontSize: '0.8125rem', marginBottom: '8px', color: theme.colors.status.error }}>
              {failedEntries.length} {failedEntries.length === 1 ? 'entry' : 'entries'} failed to analyze
            </Text>
            <div style={{
              backgroundColor: theme.colors.background.subtle,
              borderRadius: '8px',
              padding: '8px',
              maxHeight: '150px',
              overflowY: 'auto',
            }}>
              {failedEntries.map(entry => (
                <div key={entry.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderBottom: `1px solid ${theme.colors.border.secondary}`,
                  gap: '8px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="primary" style={{ fontSize: '0.75rem' }}>
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </Text>
                    <Text variant="muted" style={{ fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.error || 'Unknown error'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRetryFailed(entry.id)}
                      style={{ padding: '2px 6px', fontSize: '0.6875rem' }}
                    >
                      Retry
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDismissFailed(entry.id)}
                      style={{ padding: '2px 6px', fontSize: '0.6875rem', color: theme.colors.text.muted }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={confirmingClearEmbeddings} onClose={() => setConfirmingClearEmbeddings(false)} size="sm">
        <div style={{ padding: '20px' }}>
          <Text as="h3" variant="primary" style={{ marginBottom: '12px' }}>Clear All Embeddings?</Text>
          <Text variant="secondary" style={{ fontSize: '0.875rem', marginBottom: '20px' }}>
            You will need to re-embed all entries for chat context to work.
          </Text>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" size="sm" onClick={() => setConfirmingClearEmbeddings(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearEmbeddings}
              style={{ borderColor: theme.colors.status.error, color: theme.colors.status.error }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmingClearInsights} onClose={() => setConfirmingClearInsights(false)} size="sm">
        <div style={{ padding: '20px' }}>
          <Text as="h3" variant="primary" style={{ marginBottom: '12px' }}>Clear All Insights?</Text>
          <Text variant="secondary" style={{ fontSize: '0.875rem', marginBottom: '20px' }}>
            You will need to re-analyze all entries.
          </Text>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" size="sm" onClick={() => setConfirmingClearInsights(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearInsights}
              style={{ borderColor: theme.colors.status.error, color: theme.colors.status.error }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
