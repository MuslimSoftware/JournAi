import type { ModuleInput, ModuleOutput } from '../modules';
import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';

export interface DatasetExample<TInput = ModuleInput, TOutput = ModuleOutput> {
  id: string;
  input: TInput;
  expectedOutput: TOutput;
  metadata?: {
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    notes?: string;
  };
}

export interface Dataset<TInput = ModuleInput, TOutput = ModuleOutput> {
  version: string;
  moduleId: string;
  description: string;
  examples: DatasetExample<TInput, TOutput>[];
}

export async function loadDataset<TInput, TOutput>(
  path: string
): Promise<Dataset<TInput, TOutput>> {
  try {
    await access(path, constants.R_OK);
  } catch {
    throw new Error(`Dataset not found: ${path}`);
  }
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

export async function saveDataset<TInput, TOutput>(
  dataset: Dataset<TInput, TOutput>,
  path: string
): Promise<void> {
  await writeFile(path, JSON.stringify(dataset, null, 2), 'utf-8');
}

export function splitDataset<TInput, TOutput>(
  dataset: Dataset<TInput, TOutput>,
  trainRatio: number = 0.8
): { train: DatasetExample<TInput, TOutput>[]; test: DatasetExample<TInput, TOutput>[] } {
  const shuffled = [...dataset.examples].sort(() => Math.random() - 0.5);
  const trainSize = Math.floor(shuffled.length * trainRatio);

  return {
    train: shuffled.slice(0, trainSize),
    test: shuffled.slice(trainSize),
  };
}

export function validateDataset<TInput, TOutput>(
  dataset: Dataset<TInput, TOutput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!dataset.examples || dataset.examples.length === 0) {
    errors.push('Dataset must contain at least one example');
  }

  for (let i = 0; i < dataset.examples.length; i++) {
    const ex = dataset.examples[i];
    if (!ex.id) errors.push(`Example ${i} missing id`);
    if (!ex.input) errors.push(`Example ${i} missing input`);
    if (!ex.expectedOutput) errors.push(`Example ${i} missing expectedOutput`);
  }

  return { valid: errors.length === 0, errors };
}
