#!/usr/bin/env bun
import { loadDataset } from '../../src/ai/optimization/datasets';
import { loadLatestArtifact } from '../../src/ai/optimization/artifacts';
import { getModule, loadCompiledModule } from '../../src/ai/modules';
import { getProvider } from '../../src/ai/providers';
import { F1ScoreMetric, ToolMatchMetric } from '../../src/ai/evaluation/composite';

async function main() {
  const args = process.argv.slice(2);
  const moduleId = args[0] || 'journal-chat';
  const useCompiled = args.includes('--compiled');

  const datasetMap: Record<string, string> = {
    'journal-chat': 'evals/datasets/chat-golden.json',
    'tool-router': 'evals/datasets/tool-routing.json',
  };

  const datasetPath = datasetMap[moduleId];
  if (!datasetPath) {
    console.error('Error: Unknown module');
    process.exit(1);
  }

  console.log(`\n📊 Evaluating module: ${moduleId}`);
  console.log(`   Using ${useCompiled ? 'compiled' : 'default'} prompt\n`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable required');
    process.exit(1);
  }

  if (useCompiled) {
    const artifact = await loadLatestArtifact(moduleId);
    if (artifact) {
      await loadCompiledModule(moduleId, artifact);
      console.log(`✓ Loaded compiled artifact from ${artifact.compiledAt}\n`);
    } else {
      console.log(`⚠ No compiled artifact found, using default\n`);
    }
  }

  const dataset = await loadDataset(datasetPath);
  const module = getModule(moduleId);
  const provider = getProvider('openai');
  const config = { apiKey, model: 'gpt-4o-mini', temperature: 0.7 };

  const metric = moduleId === 'tool-router'
    ? new ToolMatchMetric()
    : new F1ScoreMetric();

  const results: Array<{ id: string; passed: boolean; score: number }> = [];

  console.log('Running evaluation...\n');

  for (const example of dataset.examples) {
    process.stdout.write(`  ${example.id}... `);

    const output = await module.forward({ provider, config }, example.input);
    const evalResult = await metric.evaluate({
      predicted: output,
      expected: example.expectedOutput,
    });

    results.push({
      id: example.id,
      passed: evalResult.passed,
      score: evalResult.score,
    });

    console.log(`${evalResult.passed ? '✓' : '✗'} (${(evalResult.score * 100).toFixed(0)}%)`);
  }

  const passed = results.filter((r) => r.passed).length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULTS: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Average score: ${(avgScore * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);

  if (!useCompiled) {
    console.log(`💡 Tip: Run optimization to improve performance`);
    console.log(`   bun evals/scripts/optimize.ts ${moduleId}\n`);
  }
}

main().catch(console.error);
