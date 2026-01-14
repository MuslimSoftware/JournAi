import { useState } from 'react';
import Text from '../themed/Text';
import { selectImportFolder, importEntriesFromFolder, ImportResult } from '../../services/import';
import { IoFolderOpenOutline } from 'react-icons/io5';
import '../../styles/settings.css';

export default function DataManagementSection() {
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleImport = async () => {
        setResult(null);
        const folder = await selectImportFolder();
        if (!folder) return;

        setIsImporting(true);
        setProgress({ current: 0, total: 0 });

        try {
            const importResult = await importEntriesFromFolder(folder, (current, total) => {
                setProgress({ current, total });
            });
            setResult(importResult);
        } catch (err) {
            setResult({
                imported: 0,
                skipped: 0,
                todosImported: 0,
                stickyNotesImported: 0,
                errors: [`Import failed: ${err}`],
            });
        } finally {
            setIsImporting(false);
            setProgress(null);
        }
    };

    return (
        <div>
            <div className="settings-section">
                <Text as="h3" variant="primary" className="settings-section-header">
                    Import Data
                </Text>
                <p className="settings-section-description">
                    Import entries from a backup folder. Files should be named with dates (e.g., 2024-01-15.md).
                </p>
                <button
                    className="settings-import-button"
                    onClick={handleImport}
                    disabled={isImporting}
                >
                    <IoFolderOpenOutline size={14} />
                    {isImporting
                        ? progress
                            ? `Importing... (${progress.current}/${progress.total})`
                            : 'Starting import...'
                        : 'Select Folder to Import'}
                </button>
                {result && (
                    <div className="settings-import-result">
                        <div className="settings-import-success">
                            ✓ Imported {result.imported} {result.imported === 1 ? 'entry' : 'entries'}
                        </div>
                        {result.todosImported > 0 && (
                            <div className="settings-import-success">
                                ✓ Imported {result.todosImported} {result.todosImported === 1 ? 'todo' : 'todos'}
                            </div>
                        )}
                        {result.stickyNotesImported > 0 && (
                            <div className="settings-import-success">
                                ✓ Imported {result.stickyNotesImported} {result.stickyNotesImported === 1 ? 'sticky note' : 'sticky notes'}
                            </div>
                        )}
                        {result.skipped > 0 && (
                            <div className="settings-import-skip">
                                Skipped {result.skipped} (already exist or invalid format)
                            </div>
                        )}
                        {result.errors.length > 0 && (
                            <div className="settings-import-errors">
                                {result.errors.slice(0, 5).map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                                {result.errors.length > 5 && (
                                    <div>...and {result.errors.length - 5} more errors</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
