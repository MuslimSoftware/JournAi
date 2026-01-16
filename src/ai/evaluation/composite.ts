import type { Metric, EvaluationInput, EvaluationResult } from './base';

export interface CompositeEvaluationResult extends EvaluationResult {
  breakdown: Record<string, EvaluationResult>;
}

export interface MetricWeight<TOutput = unknown> {
  metric: Metric<TOutput>;
  weight: number;
}

export class CompositeMetric<TOutput = unknown> implements Metric<TOutput> {
  readonly name = 'composite';
  readonly threshold: number;
  private readonly metrics: MetricWeight<TOutput>[];

  constructor(metrics: MetricWeight<TOutput>[], threshold: number = 0.7) {
    this.metrics = metrics;
    this.threshold = threshold;
  }

  async evaluate(input: EvaluationInput<TOutput>): Promise<CompositeEvaluationResult> {
    const results = await Promise.all(
      this.metrics.map(async ({ metric, weight }) => {
        const result = await metric.evaluate(input);
        return { name: metric.name, result, weight };
      })
    );

    const breakdown: Record<string, EvaluationResult> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const { name, result, weight } of results) {
      breakdown[name] = result;
      weightedSum += result.score * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      score: overallScore,
      passed: overallScore >= this.threshold,
      breakdown,
    };
  }
}

export { ExactMatchMetric, F1ScoreMetric } from './exactMatch';
export { ToolMatchMetric } from './toolMatch';
