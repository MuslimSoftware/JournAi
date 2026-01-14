import { useState, useEffect, useCallback, useRef } from 'react';
import { IoCheckmarkCircle, IoAlertCircle, IoSync, IoSparkles, IoAnalytics, IoTrash, IoClose } from 'react-icons/io5';
import { Text, Button } from '../themed';
import Modal from '../Modal';
import '../../styles/settings.css';
import '../../styles/themed.css';
import { getEmbeddingStats, embedAllEntries, clearAllEmbeddings, type EmbeddingStats } from '../../services/embeddings';
import { getApiKey } from '../../lib/secureStorage';
import { getAnalyticsStats, queueAllEntriesForAnalysis, processAnalyticsQueue, clearAllInsights, getFailedAnalysisEntries, retryFailedEntry, dismissFailedEntry, type FailedAnalysisEntry } from '../../services/analytics';
import type { AnalyticsStats } from '../../types/analytics';

export default function MemorySection() {
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

  const embeddedPercentage = stats && stats.totalEntries > 0
    ? Math.round((stats.entriesWithEmbeddings / stats.totalEntries) * 100)
    : 0;

  const unembeddedCount = stats ? stats.totalEntries - stats.entriesWithEmbeddings : 0;

  const progressWidth = progress ? `${(progress.current / progress.total) * 100}%` : '0%';
  const analyticsProgressWidth = analyticsProgress.total > 0
    ? `${(analyticsProgress.current / analyticsProgress.total) * 100}%`
    : '30%';

  return (
    <div>
      <Text as="h3" variant="primary" className="settings-section__title">
        Memory & RAG
      </Text>

      <div className="settings-section">
        <Text variant="secondary" className="settings-section__description">
          Your journal entries are processed with AI to enable smart search and personalized responses.
        </Text>
      </div>

      {loading ? (
        <div className="settings-stat-box">
          <Text variant="muted" className="settings-section__description">Loading stats...</Text>
        </div>
      ) : stats ? (
        <div className="settings-stat-box">
          <div className="settings-stat-row">
            <span className="settings-stat-label">Total Entries</span>
            <span className="settings-stat-value">{stats.totalEntries}</span>
          </div>
          <div className="settings-stat-row">
            <span className="settings-stat-label">Embedded Entries</span>
            <span className="settings-stat-value">
              {stats.entriesWithEmbeddings} ({embeddedPercentage}%)
            </span>
          </div>
          <div className="settings-stat-row">
            <span className="settings-stat-label">Total Chunks</span>
            <span className="settings-stat-value">{stats.totalChunks}</span>
          </div>
          {unembeddedCount > 0 && (
            <div className="settings-stat-row">
              <span className="settings-stat-label settings-stat-label--warning">
                Pending Embeddings
              </span>
              <span className="settings-stat-value settings-stat-value--warning">
                {unembeddedCount}
              </span>
            </div>
          )}
        </div>
      ) : null}

      <div className="settings-section">
        <div className="settings-button-row">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEmbedAll}
            disabled={processing || unembeddedCount === 0}
            className="settings-button-content"
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
              className="settings-button-content settings-button--danger"
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
            <div className="settings-progress-container">
              <div className="settings-progress-bar" style={{ width: progressWidth }} />
            </div>
            <Text variant="muted" className="settings-progress-text">
              Processing {progress.current} of {progress.total} entries...
            </Text>
          </div>
        )}

        {result && (
          <div className={`settings-status ${result.failed === 0 ? 'settings-status--success' : 'settings-status--warning'}`}>
            <span className="settings-status__icon">
              {result.failed === 0 ? <IoCheckmarkCircle size={14} /> : <IoAlertCircle size={14} />}
            </span>
            {result.failed === 0
              ? `Successfully embedded ${result.success} entries`
              : `${result.success} succeeded, ${result.failed} failed`}
          </div>
        )}

        {error && (
          <div className="settings-status settings-status--error">
            <span className="settings-status__icon">
              <IoAlertCircle size={14} />
            </span>
            {error}
          </div>
        )}

        <p className="settings-hint">
          {unembeddedCount > 0
            ? `${unembeddedCount} entries are not yet embedded. Click the button to process them.`
            : 'All entries are embedded. New entries will be embedded automatically when saved.'}
        </p>
      </div>

      <div className="settings-divider">
        <Text as="h4" variant="primary" className="settings-section__subtitle">
          Journal Analytics
        </Text>
        <Text variant="secondary" className="settings-section__description">
          Extract emotions and people mentioned from your entries for better insights.
        </Text>

        {analyticsStats && (
          <div className="settings-stat-box">
            <div className="settings-stat-row">
              <span className="settings-stat-label">Entries Processed</span>
              <span className="settings-stat-value">{analyticsStats.entriesAnalyzed}</span>
            </div>
            <div className="settings-stat-row">
              <span className="settings-stat-label">Total Insights</span>
              <span className="settings-stat-value">{analyticsStats.totalInsights}</span>
            </div>
            {analyticsStats.entriesPending > 0 && (
              <div className="settings-stat-row">
                <span className="settings-stat-label settings-stat-label--warning">
                  Pending Analysis
                </span>
                <span className="settings-stat-value settings-stat-value--warning">
                  {analyticsStats.entriesPending}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="settings-button-row">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing}
            className="settings-button-content"
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
              className="settings-button-content settings-button--danger"
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
            <div className="settings-progress-container">
              <div
                className={`settings-progress-bar${analyticsProgress.total === 0 ? ' settings-progress-bar--indeterminate' : ''}`}
                style={{ width: analyticsProgressWidth }}
              />
            </div>
            <div className="settings-progress-row">
              <Text variant="muted" className="settings-progress-text">
                {analyticsProgress.total > 0
                  ? `Analyzing ${analyticsProgress.current} of ${analyticsProgress.total} entries...`
                  : 'Queuing entries...'}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelAnalysis}
                disabled={isCancelling}
                className="settings-cancel-button settings-button-content"
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
          <div className={`settings-status ${analyticsResult.failed === 0 ? 'settings-status--success' : 'settings-status--warning'}`}>
            <span className="settings-status__icon">
              {analyticsResult.failed === 0 ? <IoCheckmarkCircle size={14} /> : <IoAlertCircle size={14} />}
            </span>
            {analyticsResult.failed === 0
              ? `Successfully analyzed ${analyticsResult.success} entries`
              : `${analyticsResult.success} succeeded, ${analyticsResult.failed} failed`}
          </div>
        )}

        {failedEntries.length > 0 && (
          <div className="settings-failed-list">
            <Text variant="secondary" className="settings-failed-list__title">
              {failedEntries.length} {failedEntries.length === 1 ? 'entry' : 'entries'} failed to analyze
            </Text>
            <div className="settings-failed-list__container">
              {failedEntries.map(entry => (
                <div key={entry.id} className="settings-failed-item">
                  <div className="settings-failed-item__info">
                    <Text variant="primary" className="settings-failed-item__date">
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </Text>
                    <Text variant="muted" className="settings-failed-item__error">
                      {entry.error || 'Unknown error'}
                    </Text>
                  </div>
                  <div className="settings-failed-item__actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRetryFailed(entry.id)}
                      className="settings-failed-item__button"
                    >
                      Retry
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDismissFailed(entry.id)}
                      className="settings-failed-item__button settings-failed-item__button--muted"
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
        <div className="settings-modal-content">
          <Text as="h3" variant="primary" className="settings-modal__title">Clear All Embeddings?</Text>
          <Text variant="secondary" className="settings-modal__description">
            You will need to re-embed all entries for chat context to work.
          </Text>
          <div className="settings-modal__actions">
            <Button variant="secondary" size="sm" onClick={() => setConfirmingClearEmbeddings(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearEmbeddings}
              className="settings-button--danger"
            >
              Clear
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmingClearInsights} onClose={() => setConfirmingClearInsights(false)} size="sm">
        <div className="settings-modal-content">
          <Text as="h3" variant="primary" className="settings-modal__title">Clear All Insights?</Text>
          <Text variant="secondary" className="settings-modal__description">
            You will need to re-analyze all entries.
          </Text>
          <div className="settings-modal__actions">
            <Button variant="secondary" size="sm" onClick={() => setConfirmingClearInsights(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearInsights}
              className="settings-button--danger"
            >
              Clear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
