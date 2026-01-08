import { useState, CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Text from '../themed/Text';
import { selectImportFolder, importEntriesFromFolder, ImportResult } from '../../services/import';
import { IoFolderOpenOutline } from 'react-icons/io5';

export default function DataManagementSection() {
    const { theme } = useTheme();
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

    const sectionStyle: CSSProperties = {
        marginBottom: '16px',
    };

    const headerStyle: CSSProperties = {
        marginBottom: '8px',
        fontSize: '1rem',
    };

    const descriptionStyle: CSSProperties = {
        marginBottom: '12px',
        color: theme.colors.text.secondary,
        fontSize: '0.8125rem',
        lineHeight: 1.5,
    };

    const buttonStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: theme.colors.background.subtle,
        color: theme.colors.text.primary,
        border: `1px solid ${theme.colors.border.primary}`,
        borderRadius: '6px',
        cursor: isImporting ? 'not-allowed' : 'pointer',
        fontSize: '0.8125rem',
        fontWeight: 500,
        opacity: isImporting ? 0.7 : 1,
        transition: 'all 0.15s',
    };

    const resultStyle: CSSProperties = {
        marginTop: '12px',
        padding: '12px',
        backgroundColor: theme.colors.background.subtle,
        borderRadius: '6px',
        fontSize: '0.8125rem',
    };

    const successStyle: CSSProperties = {
        color: theme.colors.status.success,
        marginBottom: '4px',
    };

    const skipStyle: CSSProperties = {
        color: theme.colors.text.secondary,
        marginBottom: '4px',
    };

    const errorStyle: CSSProperties = {
        color: theme.colors.status.error,
        marginTop: '8px',
    };

    return (
        <div>
            <div style={sectionStyle}>
                <Text as="h3" variant="primary" style={headerStyle}>
                    Import Data
                </Text>
                <p style={descriptionStyle}>
                    Import entries from a backup folder. Files should be named with dates (e.g., 2024-01-15.md).
                </p>
                <button
                    style={buttonStyle}
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
                    <div style={resultStyle}>
                        <div style={successStyle}>
                            ✓ Imported {result.imported} {result.imported === 1 ? 'entry' : 'entries'}
                        </div>
                        {result.todosImported > 0 && (
                            <div style={successStyle}>
                                ✓ Imported {result.todosImported} {result.todosImported === 1 ? 'todo' : 'todos'}
                            </div>
                        )}
                        {result.stickyNotesImported > 0 && (
                            <div style={successStyle}>
                                ✓ Imported {result.stickyNotesImported} {result.stickyNotesImported === 1 ? 'sticky note' : 'sticky notes'}
                            </div>
                        )}
                        {result.skipped > 0 && (
                            <div style={skipStyle}>
                                Skipped {result.skipped} (already exist or invalid format)
                            </div>
                        )}
                        {result.errors.length > 0 && (
                            <div style={errorStyle}>
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
