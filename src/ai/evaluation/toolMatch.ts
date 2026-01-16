import type { Metric, EvaluationInput, EvaluationResult } from './base';
import type { ToolRouterOutput } from '../modules';

export class ToolMatchMetric implements Metric<ToolRouterOutput> {
  readonly name = 'tool_match';
  readonly threshold = 1.0;

  evaluate(input: EvaluationInput<ToolRouterOutput>): EvaluationResult {
    const { predicted, expected } = input;

    const toolNameMatch = predicted.toolName === expected.toolName;
    const shouldUseToolMatch = predicted.shouldUseTool === expected.shouldUseTool;

    let argsMatch = true;
    if (expected.toolArguments && predicted.toolArguments) {
      argsMatch = this.compareArguments(predicted.toolArguments, expected.toolArguments);
    }

    const allMatch = toolNameMatch && shouldUseToolMatch && argsMatch;

    return {
      score: allMatch ? 1.0 : 0.0,
      passed: allMatch,
      details: {
        toolNameMatch,
        shouldUseToolMatch,
        argsMatch,
      },
    };
  }

  private compareArguments(pred: Record<string, unknown>, exp: Record<string, unknown>): boolean {
    const expKeys = Object.keys(exp);
    for (const key of expKeys) {
      if (JSON.stringify(pred[key]) !== JSON.stringify(exp[key])) {
        return false;
      }
    }
    return true;
  }
}
