import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import DataManagementSection from '../DataManagementSection';
import { renderWithProviders } from '../../../test/utils/render';

const mockSelectImportSource = vi.fn();
const mockBuildImportPreview = vi.fn();
const mockExecuteImportPlan = vi.fn();

const mockSelectExportDestination = vi.fn();
const mockExportData = vi.fn();

vi.mock('../../../services/import', () => ({
  selectImportSource: (...args: unknown[]) => mockSelectImportSource(...args),
  buildImportPreview: (...args: unknown[]) => mockBuildImportPreview(...args),
  executeImportPlan: (...args: unknown[]) => mockExecuteImportPlan(...args),
}));

vi.mock('../../../services/export', () => ({
  selectExportDestination: (...args: unknown[]) => mockSelectExportDestination(...args),
  exportData: (...args: unknown[]) => mockExportData(...args),
}));

describe('DataManagementSection Import Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelectImportSource.mockResolvedValue('/tmp/data.json');
    mockExecuteImportPlan.mockResolvedValue({
      entriesCreated: 1,
      entriesAppended: 1,
      todosCreated: 2,
      stickyNotesCreated: 1,
      duplicatesSkipped: 3,
      errors: [],
    });

    mockSelectExportDestination.mockResolvedValue('/tmp/export.json');
    mockExportData.mockResolvedValue({
      format: 'json_bundle',
      destinationPath: '/tmp/export.json',
      entriesExported: 4,
      todosExported: 5,
      stickyNotesExported: 2,
      files: ['/tmp/export.json'],
      errors: [],
    });
  });

  it('moves from source step to preview step', async () => {
    mockBuildImportPreview.mockResolvedValue({
      format: 'json_bundle',
      totals: {
        entriesToCreate: 1,
        entriesToAppend: 1,
        todosToCreate: 1,
        stickyNotesToCreate: 1,
        duplicatesSkipped: 0,
      },
      errors: [],
      warnings: [],
      plan: {
        source: { format: 'json_bundle', path: '/tmp/data.json' },
        records: { entries: [], todos: [], stickyNotes: [] },
      },
    });

    renderWithProviders(<DataManagementSection />);

    fireEvent.click(screen.getByRole('button', { name: /select json file/i }));

    await waitFor(() => {
      expect(screen.getByText('/tmp/data.json')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

    await waitFor(() => {
      expect(screen.getByTestId('import-step-2')).toBeInTheDocument();
      expect(screen.getByTestId('import-preview-summary')).toBeInTheDocument();
    });
  });

  it('disables confirm import when preview has errors', async () => {
    mockBuildImportPreview.mockResolvedValue({
      format: 'json_bundle',
      totals: {
        entriesToCreate: 0,
        entriesToAppend: 0,
        todosToCreate: 0,
        stickyNotesToCreate: 0,
        duplicatesSkipped: 0,
      },
      errors: ['entries[0]: invalid date'],
      warnings: [],
      plan: {
        source: { format: 'json_bundle', path: '/tmp/data.json' },
        records: { entries: [], todos: [], stickyNotes: [] },
      },
    });

    renderWithProviders(<DataManagementSection />);

    fireEvent.click(screen.getByRole('button', { name: /select json file/i }));
    await waitFor(() => expect(screen.getByText('/tmp/data.json')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

    const confirmButton = await screen.findByRole('button', { name: /confirm import/i });
    expect(confirmButton).toBeDisabled();
  });

  it('renders import results after successful execution', async () => {
    mockBuildImportPreview.mockResolvedValue({
      format: 'json_bundle',
      totals: {
        entriesToCreate: 1,
        entriesToAppend: 0,
        todosToCreate: 2,
        stickyNotesToCreate: 1,
        duplicatesSkipped: 0,
      },
      errors: [],
      warnings: [],
      plan: {
        source: { format: 'json_bundle', path: '/tmp/data.json' },
        records: { entries: [], todos: [], stickyNotes: [] },
      },
    });

    renderWithProviders(<DataManagementSection />);

    fireEvent.click(screen.getByRole('button', { name: /select json file/i }));
    await waitFor(() => expect(screen.getByText('/tmp/data.json')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

    const confirmButton = await screen.findByRole('button', { name: /confirm import/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByTestId('import-result-panel')).toBeInTheDocument();
      expect(screen.getByText('Created entries: 1')).toBeInTheDocument();
      expect(screen.getByText('Appended entries: 1')).toBeInTheDocument();
      expect(screen.getByText('Created todos: 2')).toBeInTheDocument();
      expect(screen.getByText('Created sticky notes: 1')).toBeInTheDocument();
      expect(screen.getByText('Duplicates skipped: 3')).toBeInTheDocument();
    });
  });

  it('renders export results after successful execution', async () => {
    renderWithProviders(<DataManagementSection />);

    const exportSection = screen.getByTestId('export-section');

    fireEvent.click(within(exportSection).getByRole('button', { name: /select json destination/i }));

    await waitFor(() => {
      expect(within(exportSection).getByText('/tmp/export.json')).toBeInTheDocument();
    });

    fireEvent.click(within(exportSection).getByRole('button', { name: /export data/i }));

    await waitFor(() => {
      expect(screen.getByTestId('export-result-panel')).toBeInTheDocument();
      expect(screen.getByText('Exported entries: 4')).toBeInTheDocument();
      expect(screen.getByText('Exported todos: 5')).toBeInTheDocument();
      expect(screen.getByText('Exported sticky notes: 2')).toBeInTheDocument();
      expect(screen.getByText('Files written: 1')).toBeInTheDocument();
    });

    expect(mockExportData).toHaveBeenCalledWith(
      {
        format: 'json_bundle',
        destinationPath: '/tmp/export.json',
      },
      expect.any(Function)
    );
  });
});
