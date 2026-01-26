#!/usr/bin/env bun
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { OpenAIModel } from '../src/types/chat';
import type { EvalDataset } from './lib/types';
import { runEvaluation, type RunnerConfig } from './lib/runner';
import { formatConsoleReport, formatJsonReport } from './lib/report';
import { getApiKey } from './config';
import { cleanupEvalResources } from './lib/agentWrapper';

const DATASETS_DIR = join(import.meta.dir, 'datasets');

interface CLIArgs {
  dataset?: string;
  filters: string[];
  output: 'console' | 'json';
  verbose: boolean;
  model: OpenAIModel;
  dryRun: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    filters: [],
    output: 'console',
    verbose: false,
    model: 'gpt-4.1-mini',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-d' || arg === '--dataset') {
      result.dataset = args[++i];
    } else if (arg === '-f' || arg === '--filter') {
      result.filters.push(args[++i]);
    } else if (arg === '-o' || arg === '--output') {
      const output = args[++i];
      if (output === 'json' || output === 'console') {
        result.output = output;
      }
    } else if (arg === '-v' || arg === '--verbose') {
      result.verbose = true;
    } else if (arg === '-m' || arg === '--model') {
      result.model = args[++i] as OpenAIModel;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
JournAi Evaluation Runner

Usage:
  bun run evals/run.ts [options]

Options:
  -d, --dataset <name>   Run specific dataset (e.g., tool-routing, response-quality)
  -f, --filter <tag>     Filter test cases by tag (can be used multiple times)
  -o, --output <format>  Output format: console (default) or json
  -v, --verbose          Show detailed output for all tests
  -m, --model <model>    Model to use (default: gpt-4.1-mini)
  --dry-run              Capture tool calls without executing them
  -h, --help             Show this help message

Examples:
  bun run evals/run.ts                           # Run all datasets
  bun run evals/run.ts -d tool-routing           # Run specific dataset
  bun run evals/run.ts -f emotions -f query      # Filter by tags
  bun run evals/run.ts -o json                   # Output as JSON
  bun run evals/run.ts -v                        # Verbose output
  bun run evals/run.ts --dry-run                 # Tool routing only (no execution)
`);
}

async function loadDatasets(filter?: string): Promise<EvalDataset[]> {
  const files = await readdir(DATASETS_DIR);
  const datasets: EvalDataset[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const name = file.replace('.json', '');
    if (filter && name !== filter) continue;

    const content = await readFile(join(DATASETS_DIR, file), 'utf-8');
    datasets.push(JSON.parse(content));
  }

  return datasets;
}

function loadApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`Error: OpenAI API key not found.

Set it via one of:
  - OPENAI_API_KEY environment variable
  - evals/.env.local file (OPENAI_API_KEY=sk-...)
  - ~/.journai/config.json file ({"openaiApiKey": "sk-..."})
`);
    process.exit(1);
  }
  return apiKey;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const apiKey = loadApiKey();

  const datasets = await loadDatasets(args.dataset);

  if (datasets.length === 0) {
    console.error(
      args.dataset
        ? `Error: Dataset "${args.dataset}" not found`
        : 'Error: No datasets found'
    );
    process.exit(1);
  }

  const config: RunnerConfig = {
    apiKey,
    model: args.model,
    tagFilters: args.filters.length > 0 ? args.filters : undefined,
    verbose: args.verbose,
    dryRun: args.dryRun,
  };

  const allResults = [];

  for (const dataset of datasets) {
    if (args.output === 'console') {
      console.log(`\nRunning dataset: ${dataset.name}...`);
    }

    const results = await runEvaluation(dataset, config);
    allResults.push(results);

    if (args.output === 'console') {
      console.log(formatConsoleReport(results, args.verbose));
    }
  }

  if (args.output === 'json') {
    console.log(formatJsonReport(allResults.length === 1 ? allResults[0] : { datasets: allResults }));
  }

  const totalPassed = allResults.reduce((sum, r) => sum + r.passedTests, 0);
  const totalTests = allResults.reduce((sum, r) => sum + r.totalTests, 0);
  const allPassed = totalPassed === totalTests;

  cleanupEvalResources();
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
