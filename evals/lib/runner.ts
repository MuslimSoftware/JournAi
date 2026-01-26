import type { OpenAIModel } from '../../src/types/chat';
import type {
  EvalDataset,
  EvalTestCase,
  TestCaseResult,
  EvalRunResult,
} from './types';
import { runAgent, type AgentRunOptions } from './agentWrapper';
import { evaluateToolCalls } from './toolEvaluator';
import { evaluateQuality } from './qualityEvaluator';

export interface RunnerConfig {
  apiKey: string;
  model: OpenAIModel;
  datasetFilter?: string;
  tagFilters?: string[];
  verbose?: boolean;
  dryRun?: boolean;
  mockToolResults?: Record<string, unknown>;
}

async function runTestCase(
  testCase: EvalTestCase,
  config: RunnerConfig
): Promise<TestCaseResult> {
  const startTime = Date.now();

  try {
    const isToolRoutingOnly = testCase.expectedToolCalls !== undefined && !testCase.qualityCriteria;

    const agentOptions: AgentRunOptions = {
      dryRun: config.dryRun || isToolRoutingOnly,
      mockToolResults: config.mockToolResults,
    };

    const { response, toolCalls } = await runAgent(
      testCase.input,
      testCase.conversation,
      config.apiKey,
      config.model,
      agentOptions
    );

    const toolEval = testCase.expectedToolCalls !== undefined
      ? evaluateToolCalls(toolCalls, testCase.expectedToolCalls)
      : undefined;

    const qualityEval = testCase.qualityCriteria
      ? await evaluateQuality(
          testCase.input,
          response,
          testCase.qualityCriteria,
          toolCalls.length > 0,
          config.apiKey
        )
      : undefined;

    return {
      testCase,
      toolEval,
      qualityEval,
      response,
      toolCalls,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      testCase,
      response: '',
      toolCalls: [],
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function filterTestCases(
  testCases: EvalTestCase[],
  tagFilters?: string[]
): EvalTestCase[] {
  if (!tagFilters || tagFilters.length === 0) {
    return testCases;
  }

  return testCases.filter((tc) =>
    tagFilters.some((filter) => tc.tags?.includes(filter))
  );
}

export async function runEvaluation(
  dataset: EvalDataset,
  config: RunnerConfig
): Promise<EvalRunResult> {
  const startTime = Date.now();
  const testCases = filterTestCases(dataset.testCases, config.tagFilters);
  const results: TestCaseResult[] = [];

  for (const testCase of testCases) {
    if (config.verbose) {
      console.log(`  Running: ${testCase.id} - ${testCase.name}...`);
    }
    const result = await runTestCase(testCase, config);
    results.push(result);
  }

  const passedTests = results.filter(
    (r) =>
      !r.error &&
      (r.toolEval?.passed ?? true) &&
      (r.qualityEval?.passed ?? true)
  ).length;

  const toolEvalResults = results.filter((r) => r.toolEval);
  const toolAccuracy =
    toolEvalResults.length > 0
      ? toolEvalResults.filter((r) => r.toolEval?.passed).length /
        toolEvalResults.length
      : 1;

  const qualityEvalResults = results.filter((r) => r.qualityEval);
  const avgQualityScore =
    qualityEvalResults.length > 0
      ? qualityEvalResults.reduce(
          (sum, r) => sum + (r.qualityEval?.score.overall || 0),
          0
        ) / qualityEvalResults.length
      : 0;

  return {
    datasetName: dataset.name,
    timestamp: new Date().toISOString(),
    totalTests: testCases.length,
    passedTests,
    failedTests: testCases.length - passedTests,
    toolAccuracy,
    avgQualityScore,
    results,
    durationMs: Date.now() - startTime,
  };
}
