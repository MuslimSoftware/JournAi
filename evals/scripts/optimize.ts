#!/usr/bin/env bun
import { ModuleOptimizer, type OptimizerType } from '../../src/ai/optimization/optimizer';
import { loadDataset, splitDataset, validateDataset } from '../../src/ai/optimization/datasets';
import { getModule, type ChatInput, type ChatOutput, type ToolRouterInput, type ToolRouterOutput } from '../../src/ai/modules';
import { getProvider } from '../../src/ai/providers';
import { F1ScoreMetric, ToolMatchMetric, CompositeMetric } from '../../src/ai/evaluation/composite';

async function main() {
  const args = process.argv.slice(2);
  const moduleId = args[0] || 'journal-chat';

  let optimizer: OptimizerType = 'mipro';
  if (args.includes('--ace')) optimizer = 'ace';
  if (args.includes('--gepa')) optimizer = 'gepa';
  if (args.includes('--optimizer')) {
    const idx = args.indexOf('--optimizer');
    optimizer = args[idx + 1] as OptimizerType;
  }

  const datasetMap: Record<string, string> = {
    'journal-chat': 'evals/datasets/chat-golden.json',
    'tool-router': 'evals/datasets/tool-routing.json',
    'agent-flows': 'evals/datasets/agent-flows.json',
  };

  const datasetPath = datasetMap[moduleId] || args[1];
  if (!datasetPath) {
    console.error('Error: Unknown module or missing dataset path');
    console.error('\nUsage:');
    console.error('  bun evals/scripts/optimize.ts [module] [--optimizer mipro|ace|gepa]');
    console.error('\nAvailable modules: journal-chat, tool-router, agent-flows');
    console.error('\nExamples:');
    console.error('  bun evals/scripts/optimize.ts journal-chat              # MIPROv2 (default)');
    console.error('  bun evals/scripts/optimize.ts journal-chat --ace        # ACE optimizer');
    console.error('  bun evals/scripts/optimize.ts journal-chat --gepa       # GEPA (slowest, best)');
    console.error('  bun evals/scripts/optimize.ts tool-router --optimizer mipro');
    process.exit(1);
  }

  console.log(`\n🚀 Starting optimization for: ${moduleId}`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('\n❌ Error: OPENAI_API_KEY environment variable required');
    console.error('Run: export OPENAI_API_KEY=your-key-here\n');
    process.exit(1);
  }

  const dataset = await loadDataset(datasetPath);

  const validation = validateDataset(dataset);
  if (!validation.valid) {
    console.error('\n❌ Dataset validation failed:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`\n📊 Dataset: ${dataset.examples.length} examples`);

  if (dataset.examples.length < 20) {
    console.warn(`\n⚠️  Warning: Dataset has only ${dataset.examples.length} examples`);
    console.warn(`   Recommended: 50-100+ for best results`);
    console.warn(`   Add more examples to ${datasetPath} and re-run\n`);
  }

  const optimizerInfo = ModuleOptimizer.getOptimizerInfo(optimizer);
  console.log(`\n🔧 Optimizer: ${optimizer.toUpperCase()}`);
  console.log(`   ${optimizerInfo.description}`);

  const { train, test } = splitDataset(dataset, 0.8);
  console.log(`\n📈 Split: ${train.length} train, ${test.length} test`);

  const module = getModule(moduleId);
  const provider = getProvider('openai');
  const config = { apiKey, model: 'gpt-4o-mini', temperature: 0.7 };

  const metric = moduleId === 'tool-router'
    ? new ToolMatchMetric()
    : new F1ScoreMetric();

  const moduleOptimizer = new ModuleOptimizer(module, metric, {
    optimizer,
    maxBootstrappedDemos: 10,
    maxLabeledDemos: 20,
    numCandidates: optimizer === 'ace' ? 6 : 8,
    maxSteps: 50,
    verbose: true,
  });

  const estimatedCost = (train.length / 50) * optimizerInfo.estimatedCostPer50Examples;

  console.log(`\n⚙️  Running optimization...`);
  console.log(`   Estimated time: ${optimizerInfo.estimatedTime}`);
  console.log(`   Estimated cost: $${estimatedCost.toFixed(2)} (with gpt-4o-mini)\n`);

  const result = await moduleOptimizer.optimize(train, test, provider, config);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Optimization complete!`);
  console.log(`   Optimizer: ${result.optimizer.toUpperCase()}`);
  console.log(`   Train score: ${(result.trainScore * 100).toFixed(1)}%`);
  console.log(`   Test score: ${(result.testScore * 100).toFixed(1)}%`);
  console.log(`   Artifact: evals/artifacts/${moduleId}-*.json`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Restart your app to use the optimized module`);
  console.log(`   2. Test with: bun evals/scripts/evaluate.ts ${moduleId} --compiled`);
  console.log(`   3. Try different optimizers to compare results`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`💡 Optimizer comparison:`);
  ModuleOptimizer.listOptimizers().forEach(opt => {
    const current = opt.name === optimizer ? ' (current)' : '';
    console.log(`   - ${opt.name}${current}: ${opt.description}`);
  });
  console.log();
}

main().catch(console.error);
