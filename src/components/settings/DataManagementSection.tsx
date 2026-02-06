import { useState } from 'react';
import { IoFolderOpenOutline } from 'react-icons/io5';
import Text from '../themed/Text';
import {
  buildImportPreview,
  executeImportPlan,
  selectImportSource,
  type ImportExecutionResult,
  type ImportFormat,
  type ImportPreview,
} from '../../services/import';
import '../../styles/settings.css';

type WizardStep = 1 | 2;

const FORMAT_OPTIONS: Array<{ value: ImportFormat; label: string; description: string }> = [
  {
    value: 'json_bundle',
    label: 'JSON bundle',
    description: 'Single JSON file with entries, todos, and stickyNotes arrays.',
  },
  {
    value: 'csv_folder',
    label: 'CSV folder',
    description: 'Folder containing entries.csv, todos.csv, and/or sticky_notes.csv.',
  },
];

function ImportInstructions({ format }: { format: ImportFormat }) {
  if (format === 'json_bundle') {
    return (
      <div className="settings-import-hint-box">
        <div className="settings-import-hint-title">JSON bundle format</div>
        <div className="settings-import-hint-text">
          Required: <code>schemaVersion: 1</code>. Arrays: <code>entries</code>, <code>todos</code>, <code>stickyNotes</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="settings-import-hint-box">
      <div className="settings-import-hint-title">CSV template filenames</div>
      <div className="settings-import-hint-text">
        Use one or more files: <code>entries.csv</code>, <code>todos.csv</code>, <code>sticky_notes.csv</code>.
      </div>
      <div className="settings-import-hint-text">
        Required headers: <code>entries.csv: date,content</code>, <code>todos.csv: date,content,completed,scheduled_time</code>,{' '}
        <code>sticky_notes.csv: date,content</code>.
      </div>
    </div>
  );
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

export default function DataManagementSection() {
  const [step, setStep] = useState<WizardStep>(1);
  const [format, setFormat] = useState<ImportFormat>('json_bundle');
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState<{ current: number; total: number } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const handleFormatChange = (nextFormat: ImportFormat) => {
    setFormat(nextFormat);
    setSourcePath(null);
    setStep(1);
    setPreview(null);
    setResult(null);
    setRuntimeError(null);
  };

  const handleSelectSource = async () => {
    setRuntimeError(null);
    const selected = await selectImportSource(format);
    if (!selected) return;

    setSourcePath(selected);
    setPreview(null);
    setResult(null);
  };

  const handleGeneratePreview = async () => {
    if (!sourcePath) return;

    setRuntimeError(null);
    setResult(null);
    setPreview(null);
    setIsPreviewing(true);
    setPreviewProgress({ current: 0, total: 0 });

    try {
      const previewResult = await buildImportPreview(
        { format, path: sourcePath },
        (current, total) => setPreviewProgress({ current, total })
      );
      setPreview(previewResult);
      setStep(2);
    } catch (error) {
      setRuntimeError(`Preview failed: ${String(error)}`);
    } finally {
      setIsPreviewing(false);
      setPreviewProgress(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!preview) return;

    setRuntimeError(null);
    setResult(null);
    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const executionResult = await executeImportPlan(
        preview,
        (current, total) => setImportProgress({ current, total })
      );
      setResult(executionResult);
    } catch (error) {
      setRuntimeError(`Import failed: ${String(error)}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const importBlocked = !preview || preview.errors.length > 0 || isImporting;

  return (
    <div>
      <div className="settings-section">
        <Text as="h3" variant="primary" className="settings-section-header">
          Import Data
        </Text>
        <p className="settings-section-description">
          Import structured data using JSON bundles or CSV templates with a validation preview before changes are applied.
        </p>

        <div className="settings-import-stepper">
          <div className={`settings-import-step${step === 1 ? ' settings-import-step--active' : ''}`}>
            1. Source
          </div>
          <div className={`settings-import-step${step === 2 ? ' settings-import-step--active' : ''}`}>
            2. Preview & Confirm
          </div>
        </div>

        {step === 1 && (
          <div className="settings-import-wizard" data-testid="import-step-1">
            <div className="settings-import-format-options">
              {FORMAT_OPTIONS.map((option) => (
                <label key={option.value} className="settings-import-format-option">
                  <input
                    type="radio"
                    name="import-format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => handleFormatChange(option.value)}
                    disabled={isPreviewing || isImporting}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <span className="settings-import-format-description">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <ImportInstructions format={format} />

            <div className="settings-import-source-row">
              <button
                className="settings-import-button"
                type="button"
                onClick={handleSelectSource}
                disabled={isPreviewing || isImporting}
              >
                <IoFolderOpenOutline size={14} />
                {format === 'json_bundle' ? 'Select JSON file' : 'Select CSV folder'}
              </button>
              <div className="settings-import-source-path">
                {sourcePath ?? 'No source selected'}
              </div>
            </div>

            <button
              type="button"
              className="settings-import-button settings-import-button--secondary"
              onClick={handleGeneratePreview}
              disabled={!sourcePath || isPreviewing || isImporting}
            >
              {isPreviewing
                ? previewProgress
                  ? `Building preview... (${previewProgress.current}/${previewProgress.total})`
                  : 'Building preview...'
                : 'Generate Preview'}
            </button>
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

            <div className="settings-import-actions">
              <button
                type="button"
                className="settings-import-button settings-import-button--secondary"
                onClick={() => setStep(1)}
                disabled={isImporting}
              >
                Back
              </button>
              <button
                type="button"
                className="settings-import-button"
                onClick={handleExecuteImport}
                disabled={importBlocked}
              >
                {isImporting
                  ? importProgress
                    ? `Importing... (${importProgress.current}/${importProgress.total})`
                    : 'Importing...'
                  : 'Confirm Import'}
              </button>
            </div>

            {result && <ImportResultPanel result={result} />}
          </div>
        )}

        {runtimeError && <div className="settings-import-errors">{runtimeError}</div>}
      </div>
    </div>
  );
}
