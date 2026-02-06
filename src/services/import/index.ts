import { open } from '@tauri-apps/plugin-dialog';
import { buildImportPreview } from './preview';
import { executeImportPlan } from './execute';
import type { ImportFormat } from './types';

export async function selectImportSource(format: ImportFormat): Promise<string | null> {
  if (format === 'csv_folder') {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select CSV Import Folder',
    });

    return typeof selected === 'string' ? selected : null;
  }

  const selected = await open({
    directory: false,
    multiple: false,
    title: 'Select JSON Bundle File',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  return typeof selected === 'string' ? selected : null;
}

export { buildImportPreview, executeImportPlan };
export type {
  CanonicalImportRecords,
  ImportExecutionResult,
  ImportFormat,
  ImportPlan,
  ImportPreview,
  ImportSourceSelection,
} from './types';
