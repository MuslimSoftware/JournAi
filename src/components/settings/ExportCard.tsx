import { useState } from 'react';
import { IoDocumentOutline, IoFolderOutline } from 'react-icons/io5';
import { useIsMobile } from '../../hooks/useMediaQuery';
import Button from '../themed/Button';
import ProgressBar from './ProgressBar';
import StatusMessage from './StatusMessage';
import {
  exportData,
  generateJsonExportContent,
  selectExportDestination,
  type ExportFormat,
  type ExportResult,
} from '../../services/export';

interface MobileExportResult {
  entriesExported: number;
  todosExported: number;
  stickyNotesExported: number;
}

function ExportResultPanel({ result }: { result: ExportResult }) {
  return (
    <div className="settings-import-result" data-testid="export-result-panel">
      <div className="settings-import-success">Exported entries: {result.entriesExported}</div>
      <div className="settings-import-success">Exported todos: {result.todosExported}</div>
      <div className="settings-import-success">Exported sticky notes: {result.stickyNotesExported}</div>
      <div className="settings-import-skip">Files written: {result.files.length}</div>

      {result.files.length > 0 && (
        <div className="settings-import-file-list">
          {result.files.map((filePath) => (
            <div key={filePath}>{filePath}</div>
          ))}
        </div>
      )}

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

function MobileExportResultPanel({ result }: { result: MobileExportResult }) {
  return (
    <div className="settings-import-result" data-testid="export-result-panel">
      <div className="settings-import-success">Exported entries: {result.entriesExported}</div>
      <div className="settings-import-success">Exported todos: {result.todosExported}</div>
      <div className="settings-import-success">Exported sticky notes: {result.stickyNotesExported}</div>
    </div>
  );
}

export default function ExportCard() {
  const isMobile = useIsMobile();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportResultState, setExportResultState] = useState<ExportResult | null>(null);
  const [mobileExportResult, setMobileExportResult] = useState<MobileExportResult | null>(null);
  const [exportRuntimeError, setExportRuntimeError] = useState<string | null>(null);

  const handleMobileExport = async () => {
    setExportRuntimeError(null);
    setExportResultState(null);
    setMobileExportResult(null);
    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });

    try {
      const content = await generateJsonExportContent(
        (current, total) => setExportProgress({ current, total })
      );

      const blob = new Blob([content.json], { type: 'application/json' });
      const file = new File([blob], content.filename, { type: 'application/json' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = content.filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      setMobileExportResult({
        entriesExported: content.entriesExported,
        todosExported: content.todosExported,
        stickyNotesExported: content.stickyNotesExported,
      });
    } catch (error) {
      const msg = String(error);
      if (!msg.includes('AbortError') && !msg.includes('Share canceled')) {
        setExportRuntimeError(`Export failed: ${msg}`);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExportRuntimeError(null);
    setExportResultState(null);
    setMobileExportResult(null);

    const destinationPath = await selectExportDestination(format);
    if (!destinationPath) return;

    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });

    try {
      const result = await exportData(
        { format, destinationPath },
        (current, total) => setExportProgress({ current, total })
      );
      setExportResultState(result);
    } catch (error) {
      setExportRuntimeError(`Export failed: ${String(error)}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <div data-testid="export-section">
      <div className="settings-import-wizard">
        <div className="settings-export-buttons">
          {isMobile ? (
            <Button
              variant="secondary"
              icon={<IoDocumentOutline size={14} />}
              onClick={handleMobileExport}
              disabled={isExporting}
            >
              Export as JSON
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                icon={<IoDocumentOutline size={14} />}
                onClick={() => handleExport('json_bundle')}
                disabled={isExporting}
              >
                Export as JSON
              </Button>
              <Button
                variant="secondary"
                icon={<IoFolderOutline size={14} />}
                onClick={() => handleExport('csv_folder')}
                disabled={isExporting}
              >
                Export as CSV
              </Button>
            </>
          )}
        </div>

        {isExporting && exportProgress && (
          <ProgressBar
            current={exportProgress.current}
            total={exportProgress.total}
            label={`Exporting... (${exportProgress.current}/${exportProgress.total})`}
          />
        )}

        {exportResultState && <ExportResultPanel result={exportResultState} />}
        {mobileExportResult && <MobileExportResultPanel result={mobileExportResult} />}
      </div>

      {exportRuntimeError && (
        <StatusMessage variant="error">{exportRuntimeError}</StatusMessage>
      )}
    </div>
  );
}
