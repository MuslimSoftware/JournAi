import type { Metric, EvaluationInput, EvaluationResult } from './base';

export class ExactMatchMetric implements Metric<string> {
  readonly name = 'exact_match';
  readonly threshold = 1.0;

  evaluate(input: EvaluationInput<string>): EvaluationResult {
    const match = input.predicted.trim() === input.expected.trim();
    return {
      score: match ? 1.0 : 0.0,
      passed: match,
    };
  }
}

export class F1ScoreMetric implements Metric<string> {
  readonly name = 'f1_score';
  readonly threshold = 0.5;

  evaluate(input: EvaluationInput<string>): EvaluationResult {
    const predTokens = new Set(this.tokenize(input.predicted));
    const expTokens = new Set(this.tokenize(input.expected));

    const intersection = new Set([...predTokens].filter(t => expTokens.has(t)));

    const precision = predTokens.size > 0 ? intersection.size / predTokens.size : 0;
    const recall = expTokens.size > 0 ? intersection.size / expTokens.size : 0;

    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      score: f1,
      passed: f1 >= this.threshold,
      details: { precision, recall },
    };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().match(/\w+/g) || [];
  }
}
