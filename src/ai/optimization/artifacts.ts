import type { CompiledArtifact } from '../modules';
import { readFile, writeFile, access, readdir } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

const ARTIFACTS_DIR = 'evals/artifacts';

export async function saveArtifact(artifact: CompiledArtifact): Promise<string> {
  const filename = `${artifact.moduleId}-${Date.now()}.json`;
  const path = `${ARTIFACTS_DIR}/${filename}`;
  await writeFile(path, JSON.stringify(artifact, null, 2), 'utf-8');
  return path;
}

export async function loadArtifact(path: string): Promise<CompiledArtifact> {
  try {
    await access(path, constants.R_OK);
  } catch {
    throw new Error(`Artifact not found: ${path}`);
  }
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

export async function loadLatestArtifact(moduleId: string): Promise<CompiledArtifact | null> {
  let files: string[];
  try {
    files = await readdir(ARTIFACTS_DIR);
  } catch {
    return null;
  }

  const matchingFiles = files
    .filter(f => f.startsWith(`${moduleId}-`) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (matchingFiles.length === 0) return null;

  return loadArtifact(join(ARTIFACTS_DIR, matchingFiles[0]));
}
