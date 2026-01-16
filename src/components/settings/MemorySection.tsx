import { useState, useEffect, useCallback } from 'react';
import { IoCheckmarkCircle, IoAlertCircle, IoSync, IoSparkles, IoTrash } from 'react-icons/io5';
import { Text, Button } from '../themed';
import Modal from '../Modal';
import '../../styles/settings.css';
import '../../styles/themed.css';
import { getEmbeddingStats, embedAllEntries, clearAllEmbeddings, type EmbeddingStats } from '../../services/embeddings';
import { getApiKey } from '../../lib/secureStorage';

export default function MemorySection() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearingEmbeddings, setClearingEmbeddings] = useState(false);
  const [confirmingClearEmbeddings, setConfirmingClearEmbeddings] = useState(false);

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

  const embeddedPercentage = stats && stats.totalEntries > 0
    ? Math.round((stats.entriesWithEmbeddings / stats.totalEntries) * 100)
    : 0;

  const unembeddedCount = stats ? stats.totalEntries - stats.entriesWithEmbeddings : 0;

  const progressWidth = progress ? `${(progress.current / progress.total) * 100}%` : '0%';

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

    </div>
  );
}
