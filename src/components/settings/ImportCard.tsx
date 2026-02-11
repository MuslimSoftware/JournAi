import { useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import Button from '../themed/Button';
import DropZone from './DropZone';
import ProgressBar from './ProgressBar';
import StatusMessage from './StatusMessage';
import {
  buildImportPreview,
  executeImportPlan,
  selectImportSource,
  type ImportExecutionResult,
  type ImportFormat,
  type ImportPreview,
} from '../../services/import';

type MobileFilePickResult =
  | { status: 'selected'; name: string; content: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function pickFileViaInput(accept: string): Promise<MobileFilePickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    // Keep the input attached to the DOM for better mobile WebView reliability.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    let settled = false;

    const settle = (result: MobileFilePickResult) => {
      if (settled) {
        return;
      }
      settled = true;
      input.onchange = null;
      input.remove();
      resolve(result);
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        settle({ status: 'cancelled' });
        return;
      }

      try {
        const content = await file.text();
        settle({ status: 'selected', name: file.name, content });
      } catch (error) {
        settle({
          status: 'error',
          message: `Unable to read selected file: ${String(error)}`,
        });
      }
    };

    input.addEventListener('cancel', () => {
      settle({ status: 'cancelled' });
    });

    input.value = '';
    input.click();
  });
}

function detectFormat(path: string): ImportFormat {
  return path.endsWith('.json') ? 'json_bundle' : 'csv_folder';
}

function PreviewSummary({ preview }: { preview: ImportPreview }) {
  return (
    <div className="settings-import-summary" data-testid="import-preview-summary">
      <div className="settings-import-summary-row">
        <span>Entries to create</span>
        <span>{preview.totals.entriesToCreate}</span>
      </div>
      <div className="settings-import-summary-row">
        <span>Entries to append</span>
        <span>{preview.totals.entriesToAppend}</span>
      </div>
      <div className="settings-import-summary-row">
        <span>Todos to create</span>
        <span>{preview.totals.todosToCreate}</span>
      </div>
      <div className="settings-import-summary-row">
        <span>Sticky notes to create</span>
        <span>{preview.totals.stickyNotesToCreate}</span>
      </div>
      <div className="settings-import-summary-row">
        <span>Duplicates skipped</span>
        <span>{preview.totals.duplicatesSkipped}</span>
      </div>
    </div>
  );
}

function ImportResultPanel({ result }: { result: ImportExecutionResult }) {
  return (
    <div className="settings-import-result" data-testid="import-result-panel">
      <div className="settings-import-success">Created entries: {result.entriesCreated}</div>
      <div className="settings-import-success">Appended entries: {result.entriesAppended}</div>
      <div className="settings-import-success">Created todos: {result.todosCreated}</div>
      <div className="settings-import-success">Created sticky notes: {result.stickyNotesCreated}</div>
      <div className="settings-import-skip">Duplicates skipped: {result.duplicatesSkipped}</div>

      {result.errors.length > 0 && (
        <div className="settings-import-errors">
          {result.errors.map((error, index) => (
            <div key={`${error}-${index}`}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ImportCard() {
  const isMobile = useIsMobile();
  const activePreviewRequestId = useRef(0);
  const [step, setStep] = useState<1 | 2>(1);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [isSelectingMobileFile, setIsSelectingMobileFile] = useState(false);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState<{ current: number; total: number } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; phase?: 'processing' | 'writing' } | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [importRuntimeError, setImportRuntimeError] = useState<string | null>(null);

  const resetSource = () => {
    activePreviewRequestId.current += 1;
    setSourcePath(null);
    setIsSelectingMobileFile(false);
    setPreview(null);
    setImportResult(null);
    setImportRuntimeError(null);
    setStep(1);
  };

  const setSource = (path: string) => {
    setSourcePath(path);
    setPreview(null);
    setImportResult(null);
    setImportRuntimeError(null);
  };

  const generatePreview = async (format: ImportFormat, path: string, content?: string) => {
    const requestId = ++activePreviewRequestId.current;
    setImportRuntimeError(null);
    setImportResult(null);
    setPreview(null);
    setIsPreviewing(true);
    setPreviewProgress({ current: 0, total: 0 });

    try {
      const previewResult = await buildImportPreview(
        { format, path, content },
        (current, total) => setPreviewProgress({ current, total })
      );
      if (activePreviewRequestId.current !== requestId) {
        return;
      }
      setPreview(previewResult);
      setStep(2);
    } catch (error) {
      if (activePreviewRequestId.current !== requestId) {
        return;
      }
      setImportRuntimeError(`Preview failed: ${String(error)}`);
    } finally {
      if (activePreviewRequestId.current !== requestId) {
        return;
      }
      setIsPreviewing(false);
      setPreviewProgress(null);
    }
  };

  const handleDrop = (path: string) => {
    const format = detectFormat(path);
    setSource(path);
    void generatePreview(format, path);
  };

  const handleBrowse = async () => {
    setImportRuntimeError(null);

    if (isMobile) {
      setIsSelectingMobileFile(true);
      const picked = await pickFileViaInput('.json,application/json,text/json');
      setIsSelectingMobileFile(false);

      if (picked.status === 'cancelled') {
        return;
      }

      if (picked.status === 'error') {
        setImportRuntimeError(picked.message);
        return;
      }

      setSource(picked.name);
      void generatePreview('json_bundle', picked.name, picked.content);
      return;
    }

    const selected = await selectImportSource('json_bundle');
    if (!selected) return;
    setSource(selected);
    void generatePreview('json_bundle', selected);
  };

  const handleExecuteImport = async () => {
    if (!preview) return;

    setImportRuntimeError(null);
    setImportResult(null);
    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const executionResult = await executeImportPlan(
        preview,
        (current, total, phase) => setImportProgress({ current, total, phase })
      );
      setImportResult(executionResult);
      if (executionResult.errors.length === 0) {
        window.dispatchEvent(new CustomEvent('import-complete'));
      }
    } catch (error) {
      setImportRuntimeError(`Import failed: ${String(error)}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const importBlocked = !preview || preview.errors.length > 0 || isImporting;
  const importCompleted = Boolean(importResult && importResult.errors.length === 0);
  const importActionBlocked = importBlocked || importCompleted;
  const busy = isSelectingMobileFile || isPreviewing || isImporting;

  return (
    <div>
      {step === 1 && (
        <div className="settings-import-wizard" data-testid="import-step-1">
          <DropZone
            onDrop={handleDrop}
            onBrowse={handleBrowse}
            disabled={busy}
          />

          {sourcePath && (
            <div className="settings-import-source-path">{sourcePath}</div>
          )}

          <div className="settings-import-hint-box">
            <div className="settings-import-hint-title">Supported formats</div>

            <div className="settings-import-format-block">
              <div className="settings-import-hint-text"><strong>JSON file</strong> (.json)</div>
              <div className="settings-import-hint-text">
                A single file with <code>schemaVersion: 1</code> containing:
              </div>
              <ul className="settings-import-hint-list">
                <li><code>entries</code></li>
                <li><code>todos</code></li>
                <li><code>stickyNotes</code></li>
              </ul>
            </div>

            {!isMobile && (
              <div className="settings-import-format-block">
                <div className="settings-import-hint-text"><strong>CSV folder</strong></div>
                <div className="settings-import-hint-text">
                  A folder with one or more of:
                </div>
                <ul className="settings-import-hint-list">
                  <li><code>entries.csv</code> — <code>date, content</code></li>
                  <li><code>todos.csv</code> — <code>date, content, completed, scheduled_time</code></li>
                  <li><code>sticky_notes.csv</code> — <code>date, content</code></li>
                </ul>
              </div>
            )}
          </div>

          {isSelectingMobileFile && (
            <StatusMessage variant="info">Reading selected file...</StatusMessage>
          )}

          {isPreviewing && previewProgress && (
            <ProgressBar
              current={previewProgress.current}
              total={previewProgress.total}
              label={`Building preview... (${previewProgress.current}/${previewProgress.total})`}
            />
          )}
        </div>
      )}

      {step === 2 && preview && (
        <div className="settings-import-wizard" data-testid="import-step-2">
          <PreviewSummary preview={preview} />

          {preview.warnings.length > 0 && (
            <div className="settings-import-warnings" data-testid="import-preview-warnings">
              {preview.warnings.map((warning, index) => (
                <div key={`${warning}-${index}`}>{warning}</div>
              ))}
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="settings-import-errors" data-testid="import-preview-errors">
              {preview.errors.map((error, index) => (
                <div key={`${error}-${index}`}>{error}</div>
              ))}
            </div>
          )}

          {isImporting && importProgress && (
            <ProgressBar
              current={importProgress.current}
              total={importProgress.total}
              label={importProgress.phase === 'writing'
                ? `Writing to database... (${importProgress.current}/${importProgress.total})`
                : `Processing... (${importProgress.current}/${importProgress.total})`}
            />
          )}

          <div className="settings-import-actions">
            <Button
              variant="ghost"
              onClick={() => resetSource()}
              disabled={isImporting}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={handleExecuteImport}
              disabled={importActionBlocked}
            >
              {isImporting ? 'Importing...' : importCompleted ? 'Import Complete' : 'Confirm Import'}
            </Button>
          </div>

          {importCompleted && (
            <StatusMessage variant="success">Import complete. Your data was imported successfully.</StatusMessage>
          )}
          {importResult && <ImportResultPanel result={importResult} />}
        </div>
      )}

      {importRuntimeError && (
        <StatusMessage variant="error">{importRuntimeError}</StatusMessage>
      )}
    </div>
  );
}
