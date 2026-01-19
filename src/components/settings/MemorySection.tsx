import { useState, useEffect, useCallback } from 'react';
import { IoCheckmarkCircle, IoAlertCircle, IoSync, IoSparkles, IoTrash, IoAnalytics } from 'react-icons/io5';
import { Text, Button } from '../themed';
import Modal from '../Modal';
import '../../styles/settings.css';
import '../../styles/themed.css';
import { getEmbeddingStats, embedAllEntries, clearAllEmbeddings, type EmbeddingStats } from '../../services/embeddings';
import { getProcessingStats, clearAllProcessedStatus, type ProcessingStats } from '../../services/entries';
import { clearAllInsights } from '../../services/analytics';
import { processUnprocessedEntriesOnLaunch, type ProcessingProgress } from '../../services/entryAnalysis';
import { getApiKey } from '../../lib/secureStorage';

export default function MemorySection() {
  // Embedding stats state
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearingEmbeddings, setClearingEmbeddings] = useState(false);
  const [confirmingClearEmbeddings, setConfirmingClearEmbeddings] = useState(false);

  // Analysis/Processing stats state
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const [processingStatsLoading, setProcessingStatsLoading] = useState(true);
  const [analysisProcessing, setAnalysisProcessing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<ProcessingProgress | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ success: number; failed: number } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [clearingInsights, setClearingInsights] = useState(false);
  const [confirmingClearInsights, setConfirmingClearInsights] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const embeddingStats = await getEmbeddingStats();
      setStats(embeddingStats);
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProcessingStats = useCallback(async () => {
    try {
      setProcessingStatsLoading(true);
      const stats = await getProcessingStats();
      setProcessingStats(stats);
    } catch {
      setAnalysisError('Failed to load processing stats');
    } finally {
      setProcessingStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadProcessingStats();
  }, [loadStats, loadProcessingStats]);

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

  const handleProcessAll = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAnalysisError('Please configure your OpenAI API key first');
      return;
    }

    setAnalysisProcessing(true);
    setAnalysisProgress(null);
    setAnalysisResult(null);
    setAnalysisError(null);

    try {
      const result = await processUnprocessedEntriesOnLaunch((progress) => {
        setAnalysisProgress(progress);
      });

      setAnalysisResult({
        success: result.processed,
        failed: result.errors.length,
      });

      if (result.errors.length > 0) {
        console.error('Analysis errors:', result.errors);
      }

      await loadProcessingStats();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to process entries');
    } finally {
      setAnalysisProcessing(false);
      setAnalysisProgress(null);
    }
  };

  const handleClearAllInsights = async () => {
    setClearingInsights(true);
    setConfirmingClearInsights(false);
    setAnalysisError(null);
    setAnalysisResult(null);
    try {
      await clearAllInsights();
      await clearAllProcessedStatus();
      await loadProcessingStats();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to clear insights');
    } finally {
      setClearingInsights(false);
    }
  };

  const embeddedPercentage = stats && stats.totalEntries > 0
    ? Math.round((stats.entriesWithEmbeddings / stats.totalEntries) * 100)
    : 0;

  const unembeddedCount = stats ? stats.totalEntries - stats.entriesWithEmbeddings : 0;

  const progressWidth = progress ? `${(progress.current / progress.total) * 100}%` : '0%';

  // Analysis stats
  const processedPercentage = processingStats && processingStats.totalEntries > 0
    ? Math.round((processingStats.processedEntries / processingStats.totalEntries) * 100)
    : 0;

  const analysisProgressWidth = analysisProgress && analysisProgress.total > 0
    ? `${(analysisProgress.processed / analysisProgress.total) * 100}%`
    : '0%';

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
              variant="danger"
              size="sm"
              onClick={() => setConfirmingClearEmbeddings(true)}
              disabled={clearingEmbeddings || processing}
              className="settings-button-content"
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

      {/* Entry Analysis Section */}
      <div className="settings-section-divider" />

      <Text as="h3" variant="primary" className="settings-section__title">
        Entry Analysis
      </Text>

      <div className="settings-section">
        <Text variant="secondary" className="settings-section__description">
          AI analyzes your entries to extract emotions, people, and other insights for the Insights page.
        </Text>
      </div>

      {processingStatsLoading ? (
        <div className="settings-stat-box">
          <Text variant="muted" className="settings-section__description">Loading stats...</Text>
        </div>
      ) : processingStats ? (
        <div className="settings-stat-box">
          <div className="settings-stat-row">
            <span className="settings-stat-label">Processed Entries</span>
            <span className="settings-stat-value">
              {processingStats.processedEntries} ({processedPercentage}%)
            </span>
          </div>
          {processingStats.unprocessedEntries > 0 && (
            <div className="settings-stat-row">
              <span className="settings-stat-label settings-stat-label--warning">
                Unprocessed Entries
              </span>
              <span className="settings-stat-value settings-stat-value--warning">
                {processingStats.unprocessedEntries}
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
            onClick={handleProcessAll}
            disabled={analysisProcessing || clearingInsights || (processingStats?.unprocessedEntries ?? 0) === 0}
            className="settings-button-content"
          >
            {analysisProcessing ? (
              <>
                <IoSync size={14} className="spin" /> Processing...
              </>
            ) : (
              <>
                <IoAnalytics size={14} /> Process All Unprocessed
              </>
            )}
          </Button>

          {processingStats && processingStats.processedEntries > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmingClearInsights(true)}
              disabled={clearingInsights || analysisProcessing}
              className="settings-button-content"
            >
              {clearingInsights ? (
                <>
                  <IoSync size={14} className="spin" /> Clearing...
                </>
              ) : (
                <>
                  <IoTrash size={14} /> Clear All Insights
                </>
              )}
            </Button>
          )}
        </div>

        {analysisProcessing && analysisProgress && (
          <div>
            <div className="settings-progress-container">
              <div className="settings-progress-bar" style={{ width: analysisProgressWidth }} />
            </div>
            <Text variant="muted" className="settings-progress-text">
              Analyzing {analysisProgress.processed} of {analysisProgress.total} entries...
            </Text>
          </div>
        )}

        {analysisResult && (
          <div className={`settings-status ${analysisResult.failed === 0 ? 'settings-status--success' : 'settings-status--warning'}`}>
            <span className="settings-status__icon">
              {analysisResult.failed === 0 ? <IoCheckmarkCircle size={14} /> : <IoAlertCircle size={14} />}
            </span>
            {analysisResult.failed === 0
              ? `Successfully analyzed ${analysisResult.success} entries`
              : `${analysisResult.success} analyzed, ${analysisResult.failed} failed`}
          </div>
        )}

        {analysisError && (
          <div className="settings-status settings-status--error">
            <span className="settings-status__icon">
              <IoAlertCircle size={14} />
            </span>
            {analysisError}
          </div>
        )}

        <p className="settings-hint">
          {(processingStats?.unprocessedEntries ?? 0) > 0
            ? `${processingStats?.unprocessedEntries} entries have not been analyzed yet. Click the button to process them.`
            : 'All entries have been analyzed. New entries will be analyzed automatically when the app restarts.'}
        </p>
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
              variant="danger"
              size="sm"
              onClick={handleClearEmbeddings}
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
            This will delete all extracted emotions and people insights. All entries will need to be re-analyzed.
          </Text>
          <div className="settings-modal__actions">
            <Button variant="secondary" size="sm" onClick={() => setConfirmingClearInsights(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearAllInsights}
            >
              Clear
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
