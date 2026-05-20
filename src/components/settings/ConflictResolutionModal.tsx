import { useState, useEffect } from 'react';
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoCheckmarkCircle,
  IoCloudOffline,
  IoDocumentTextOutline,
  IoListOutline,
  IoDocumentOutline,
} from 'react-icons/io5';
import Modal from '../Modal';
import { Button, Text, Spinner } from '../themed';
import { useSync } from '../../hooks/useSync';
import type { SyncConflictRow } from '../../services/sync/localRepository';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
}

export default function ConflictResolutionModal({
  isOpen,
  onClose,
}: ConflictResolutionModalProps) {
  const { conflicts, resolveConflict } = useSync();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolving, setResolving] = useState<string | null>(null); // conflictId currently being resolved

  // Clamp current index if conflicts list shrinks (e.g. after a resolution)
  useEffect(() => {
    if (conflicts.length > 0 && currentIndex >= conflicts.length) {
      setCurrentIndex(Math.max(0, conflicts.length - 1));
    }
  }, [conflicts.length, currentIndex]);

  if (!isOpen) return null;

  const currentConflict = conflicts[currentIndex] as SyncConflictRow | undefined;

  const handleResolve = async (resolution: 'local' | 'remote') => {
    if (!currentConflict) return;
    setResolving(currentConflict.id);
    try {
      await resolveConflict(currentConflict.id, resolution);
      // Let the list update automatically. We don't advance the index because the resolved item is removed,
      // so the next item naturally slides into the current index.
    } catch (err) {
      console.error('[ConflictResolutionModal] Failed to resolve conflict:', err);
    } finally {
      setResolving(null);
    }
  };

  const getCollectionLabel = (collection: string) => {
    switch (collection) {
      case 'entries':
        return { label: 'Journal Entry', icon: <IoDocumentTextOutline size={18} /> };
      case 'todos':
        return { label: 'Todo Item', icon: <IoListOutline size={18} /> };
      case 'sticky_notes':
        return { label: 'Sticky Note', icon: <IoDocumentOutline size={18} /> };
      default:
        return { label: 'Record', icon: <IoDocumentTextOutline size={18} /> };
    }
  };

  // Render the side-by-side payload comparison
  const renderComparison = (conflict: SyncConflictRow) => {
    const local = conflict.local_payload ? JSON.parse(conflict.local_payload) : null;
    const remote = conflict.remote_payload ? JSON.parse(conflict.remote_payload) : null;
    const meta = getCollectionLabel(conflict.collection);

    return (
      <div className="conflict-comparison">
        <div className="conflict-item-header">
          <div className="conflict-item-type">
            <span className="conflict-type-icon">{meta.icon}</span>
            <Text variant="primary" as="span" className="conflict-type-label">
              {meta.label}
            </Text>
          </div>
          <Text variant="muted" as="span" className="conflict-item-date">
            For Date: {local?.date ?? remote?.date ?? 'Unknown'}
          </Text>
        </div>

        <div className="conflict-cards-container">
          {/* Local Version Card */}
          <div className="conflict-card conflict-card--local">
            <div className="conflict-card-header">
              <span className="conflict-card-badge conflict-card-badge--local">Local Version</span>
              <span className="conflict-card-time">Modified: {formatTimestamp(local?.updated_at ?? local?.created_at)}</span>
            </div>
            <div className="conflict-card-body">
              {local === null ? (
                <div className="conflict-deleted-state">
                  <IoCloudOffline size={32} />
                  <p>This record was deleted on this device.</p>
                </div>
              ) : (
                <div className="conflict-payload-content">
                  {conflict.collection === 'todos' && (
                    <div className="conflict-todo-meta">
                      <span className={`todo-status-badge ${local.completed ? 'completed' : 'active'}`}>
                        {local.completed ? '✓ Completed' : '○ Active'}
                      </span>
                      {local.scheduled_time && (
                        <span className="todo-time-badge">Time: {local.scheduled_time}</span>
                      )}
                    </div>
                  )}
                  <pre className="conflict-content-text">{local.content || '(Empty content)'}</pre>
                </div>
              )}
            </div>
            <div className="conflict-card-footer">
              <Button
                variant="primary"
                fullWidth
                disabled={resolving !== null}
                onClick={() => handleResolve('local')}
              >
                Keep Local Version
              </Button>
            </div>
          </div>

          {/* Cloud Version Card */}
          <div className="conflict-card conflict-card--remote">
            <div className="conflict-card-header">
              <span className="conflict-card-badge conflict-card-badge--remote">Cloud Version</span>
              <span className="conflict-card-time">Modified: {formatTimestamp(remote?.updated_at ?? remote?.created_at)}</span>
            </div>
            <div className="conflict-card-body">
              {remote === null ? (
                <div className="conflict-deleted-state">
                  <IoCloudOffline size={32} />
                  <p>This record was deleted in the cloud.</p>
                </div>
              ) : (
                <div className="conflict-payload-content">
                  {conflict.collection === 'todos' && (
                    <div className="conflict-todo-meta">
                      <span className={`todo-status-badge ${remote.completed ? 'completed' : 'active'}`}>
                        {remote.completed ? '✓ Completed' : '○ Active'}
                      </span>
                      {remote.scheduled_time && (
                        <span className="todo-time-badge">Time: {remote.scheduled_time}</span>
                      )}
                    </div>
                  )}
                  <pre className="conflict-content-text">{remote.content || '(Empty content)'}</pre>
                </div>
              )}
            </div>
            <div className="conflict-card-footer">
              <Button
                variant="secondary"
                fullWidth
                disabled={resolving !== null}
                onClick={() => handleResolve('remote')}
                style={{
                  backgroundColor: 'var(--status-success)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Keep Cloud Version
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="conflict-modal-wrapper">
        {/* Modal Header */}
        <div className="conflict-modal-header">
          <div>
            <Text variant="primary" as="h3" className="conflict-modal-title">
              Resolve Sync Conflicts
            </Text>
            <Text variant="secondary" className="conflict-modal-subtitle">
              {conflicts.length > 0
                ? `${conflicts.length} conflict(s) need your selection to ensure sync matches perfectly.`
                : 'All conflicts resolved!'}
            </Text>
          </div>
          <button className="conflict-modal-close" onClick={onClose} aria-label="Close modal">
            <IoClose size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="conflict-modal-body">
          {resolving !== null && (
            <div className="conflict-resolving-overlay">
              <Spinner size="lg" />
              <Text variant="primary" style={{ marginTop: '12px' }}>
                Applying resolution...
              </Text>
            </div>
          )}

          {conflicts.length === 0 ? (
            <div className="conflict-success-screen">
              <div className="success-icon-container">
                <IoCheckmarkCircle size={64} className="success-icon" />
              </div>
              <Text variant="primary" as="h4" className="success-title">
                Perfectly Synced!
              </Text>
              <Text variant="secondary" className="success-text">
                All outstanding conflicts have been resolved successfully. Your data is now fully synchronized with the cloud.
              </Text>
              <Button variant="primary" size="md" onClick={onClose} style={{ marginTop: '24px' }}>
                Back to Settings
              </Button>
            </div>
          ) : currentConflict ? (
            <>
              {/* Paging / Progress indicator if multiple conflicts exist */}
              {conflicts.length > 1 && (
                <div className="conflict-pager">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IoChevronBack size={16} />}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                  >
                    Prev
                  </Button>
                  <span className="conflict-pager-text">
                    Conflict {currentIndex + 1} of {conflicts.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IoChevronForward size={16} />}
                    iconPosition="right"
                    onClick={() => setCurrentIndex((prev) => Math.min(conflicts.length - 1, prev + 1))}
                    disabled={currentIndex === conflicts.length - 1}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Conflict comparison details */}
              {renderComparison(currentConflict)}
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
