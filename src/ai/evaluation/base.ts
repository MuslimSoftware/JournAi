export interface EvaluationInput<TOutput = unknown> {
  predicted: TOutput;
  expected: TOutput;
}

export interface EvaluationResult {
  score: number;
  passed: boolean;
  details?: Record<string, unknown>;
}

export interface Metric<TOutput = unknown> {
  readonly name: string;
  readonly threshold: number;
  evaluate(input: EvaluationInput<TOutput>): Promise<EvaluationResult> | EvaluationResult;
}
