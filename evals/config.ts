import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_LOCATIONS = [
  join(import.meta.dir, '.env.local'),
  join(import.meta.dir, '..', '.env.local'),
  join(homedir(), '.journai', 'config.json'),
];

export function getApiKey(): string | null {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  for (const configPath of CONFIG_LOCATIONS) {
    if (!existsSync(configPath)) continue;

    if (configPath.endsWith('.json')) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.openaiApiKey) return config.openaiApiKey;
      } catch {}
    } else {
      const content = readFileSync(configPath, 'utf-8');
      const match = content.match(/OPENAI_API_KEY=(.+)/);
      if (match) return match[1].trim();
    }
  }

  return null;
}
