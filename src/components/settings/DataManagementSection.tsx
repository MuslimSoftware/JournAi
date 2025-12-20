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
                errors: [`Import failed: ${err}`],
            });
        } finally {
            setIsImporting(false);
            setProgress(null);
        }
    };

    const sectionStyle: CSSProperties = {
        marginBottom: theme.spacing.xl,
    };

    const headerStyle: CSSProperties = {
        marginBottom: theme.spacing.md,
    };

    const descriptionStyle: CSSProperties = {
        marginBottom: theme.spacing.lg,
        color: theme.colors.text.secondary,
        fontSize: theme.typography.fontSize.h6,
        lineHeight: 1.5,
    };

    const buttonStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        backgroundColor: theme.colors.background.subtle,
        color: theme.colors.text.primary,
        border: `1px solid ${theme.colors.border.primary}`,
        borderRadius: '8px',
        cursor: isImporting ? 'not-allowed' : 'pointer',
        fontSize: theme.typography.fontSize.h6,
        fontWeight: 500,
        opacity: isImporting ? 0.7 : 1,
        transition: 'all 0.2s',
    };

    const resultStyle: CSSProperties = {
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.subtle,
        borderRadius: '8px',
        fontSize: theme.typography.fontSize.h6,
    };

    const successStyle: CSSProperties = {
        color: '#22c55e',
        marginBottom: theme.spacing.xs,
    };

    const skipStyle: CSSProperties = {
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    };

    const errorStyle: CSSProperties = {
        color: '#ef4444',
        marginTop: theme.spacing.sm,
    };

    return (
        <div>
            <div style={sectionStyle}>
                <Text as="h3" variant="primary" style={headerStyle}>
                    Import Data
                </Text>
                <p style={descriptionStyle}>
                    Import journal entries from a LifeOS backup folder. Files should be named with dates (e.g., 2024-01-15.md).
                    Only the main journal content will be imported; Notes and TODOs sections will be excluded.
                    Entries for dates that already exist will be skipped.
                </p>
                <button
                    style={buttonStyle}
                    onClick={handleImport}
                    disabled={isImporting}
                >
                    <IoFolderOpenOutline size={18} />
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
