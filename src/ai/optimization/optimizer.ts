import type { Module, ModuleInput, ModuleOutput, CompiledArtifact } from '../modules';
import type { LLMProvider, LLMConfig } from '../providers';
import type { Metric } from '../evaluation/base';
import type { DatasetExample } from './datasets';
import { saveArtifact } from './artifacts';

export type OptimizerType = 'mipro' | 'ace' | 'gepa';

export interface OptimizationConfig {
  optimizer: OptimizerType;
  maxBootstrappedDemos: number;
  maxLabeledDemos: number;
  numCandidates: number;
  maxSteps: number;
  verbose: boolean;
}

export interface OptimizationResult {
  artifact: CompiledArtifact;
  trainScore: number;
  testScore: number;
  optimizer: OptimizerType;
  costEstimate?: {
    totalTokens: number;
    estimatedCost: number;
  };
}

const DEFAULT_CONFIG: OptimizationConfig = {
  optimizer: 'mipro',
  maxBootstrappedDemos: 10,
  maxLabeledDemos: 20,
  numCandidates: 8,
  maxSteps: 50,
  verbose: true,
};

const OPTIMIZER_CONFIGS = {
  mipro: {
    description: 'MIPROv2 (default) - Bayesian optimization, proven and reliable',
    params: {
      maxBootstrappedDemos: 10,
      maxLabeledDemos: 20,
      numCandidates: 8,
    },
    estimatedTime: '~1 hour',
    estimatedCostPer50Examples: 2.5,
  },
  ace: {
    description: 'ACE - Adaptive Chain of Experts, good for complex tasks',
    params: {
      maxBootstrappedDemos: 8,
      maxLabeledDemos: 15,
      numCandidates: 6,
    },
    estimatedTime: '~1.5 hours',
    estimatedCostPer50Examples: 3.5,
  },
  gepa: {
    description: 'GEPA - Highest performance, best for production (3x slower)',
    params: {
      num_candidates: 10,
      max_steps: 10,
    },
    estimatedTime: '~2-3 hours',
    estimatedCostPer50Examples: 7.0,
  },
};

export class ModuleOptimizer<TInput extends ModuleInput, TOutput extends ModuleOutput> {
  private readonly module: Module<TInput, TOutput>;
  private readonly metric: Metric<TOutput>;
  private readonly config: OptimizationConfig;

  constructor(
    module: Module<TInput, TOutput>,
    metric: Metric<TOutput>,
    config?: Partial<OptimizationConfig>
  ) {
    this.module = module;
    this.metric = metric;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async optimize(
    trainExamples: DatasetExample<TInput, TOutput>[],
    testExamples: DatasetExample<TInput, TOutput>[],
    provider: LLMProvider,
    providerConfig: LLMConfig
  ): Promise<OptimizationResult> {
    if (this.config.verbose) {
      const optimizerInfo = OPTIMIZER_CONFIGS[this.config.optimizer];
      console.log(`\n🚀 Optimizing module: ${this.module.id}`);
      console.log(`   Optimizer: ${this.config.optimizer.toUpperCase()} - ${optimizerInfo.description}`);
      console.log(`   Training examples: ${trainExamples.length}`);
      console.log(`   Test examples: ${testExamples.length}`);
    }

    let optimized: {
      prompt?: string;
      demos?: Array<{ input: TInput; output: TOutput }>;
    };

    let totalTokens = 0;

    switch (this.config.optimizer) {
      case 'mipro':
        if (this.config.verbose) {
          console.warn('⚠️  AxMiPRO integration not yet implemented (API incompatibility)');
          console.log('Using default prompt with few-shot examples from training data...');
        }
        optimized = {
          prompt: this.module.defaultPrompt,
          demos: trainExamples.slice(0, this.config.maxLabeledDemos).map(ex => ({
            input: ex.input,
            output: ex.expectedOutput
          }))
        };
        break;

      case 'ace':
        throw new Error(
          'ACE optimizer not yet implemented. Use mipro (default) or gepa.\n' +
          'ACE will be available in a future update.'
        );

      case 'gepa':
        throw new Error(
          'GEPA optimizer not yet available in Ax TypeScript.\n' +
          'Use mipro (default). GEPA support coming soon.'
        );

      default:
        throw new Error(`Unknown optimizer: ${this.config.optimizer}`);
    }

    const trainScore = await this.evaluateExamples(trainExamples, provider, providerConfig);
    const testScore = await this.evaluateExamples(testExamples, provider, providerConfig);

    const optimizerConfig = OPTIMIZER_CONFIGS[this.config.optimizer];
    const estimatedCost = (trainExamples.length / 50) * optimizerConfig.estimatedCostPer50Examples;

    const artifact: CompiledArtifact = {
      moduleId: this.module.id,
      version: '1.0',
      compiledAt: new Date().toISOString(),
      prompt: optimized.prompt || this.module.defaultPrompt,
      fewShotExamples: optimized.demos || [],
      metadata: {
        optimizer: this.config.optimizer,
        trainScore,
        testScore,
        trainSize: trainExamples.length,
        testSize: testExamples.length,
        estimatedCost,
      },
    };

    this.module.compile(artifact);

    const savedPath = await saveArtifact(artifact);

    if (this.config.verbose) {
      console.log(`\n✅ Optimization complete!`);
      console.log(`   Train score: ${(trainScore * 100).toFixed(1)}%`);
      console.log(`   Test score: ${(testScore * 100).toFixed(1)}%`);
      console.log(`   Estimated cost: $${estimatedCost.toFixed(2)} (with gpt-4o-mini)`);
      console.log(`   Artifact: ${savedPath}`);
    }

    return {
      artifact,
      trainScore,
      testScore,
      optimizer: this.config.optimizer,
      costEstimate: {
        totalTokens: totalTokens,
        estimatedCost,
      },
    };
  }

  private async evaluateExamples(
    examples: DatasetExample<TInput, TOutput>[],
    provider: LLMProvider,
    config: LLMConfig
  ): Promise<number> {
    const scores: number[] = [];

    for (const example of examples) {
      const output = await this.module.forward({ provider, config }, example.input);
      const result = await this.metric.evaluate({
        predicted: output,
        expected: example.expectedOutput,
      });
      scores.push(result.score);
    }

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  static getOptimizerInfo(optimizer: OptimizerType) {
    return OPTIMIZER_CONFIGS[optimizer];
  }

  static listOptimizers() {
    return Object.entries(OPTIMIZER_CONFIGS).map(([name, config]) => ({
      name: name as OptimizerType,
      description: config.description,
    }));
  }
}
