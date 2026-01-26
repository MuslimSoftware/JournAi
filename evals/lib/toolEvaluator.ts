import type { ToolCall } from '../../src/types/chat';
import type { ExpectedToolCall, ToolEvalResult, ToolName } from './types';

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function containsValue(actual: unknown, expected: unknown): boolean {
  if (expected === null || expected === undefined) return true;

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    return expected.every((item) =>
      actual.some((a) => containsValue(a, item))
    );
  }

  if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null) return false;
    return Object.entries(expected as Record<string, unknown>).every(
      ([key, value]) => containsValue((actual as Record<string, unknown>)[key], value)
    );
  }

  if (typeof expected === 'string' && typeof actual === 'string') {
    return actual.toLowerCase().includes(expected.toLowerCase());
  }

  return actual === expected;
}

function parseToolArguments(toolCall: ToolCall): Record<string, unknown> {
  try {
    return JSON.parse(toolCall.arguments);
  } catch {
    return {};
  }
}

function evaluateRequiredParams(
  args: Record<string, unknown>,
  requiredParams: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  for (const [path, expectedValue] of Object.entries(requiredParams)) {
    const actualValue = getNestedValue(args, path);

    if (actualValue === undefined) {
      errors.push(`Missing required param: ${path}`);
    } else if (!containsValue(actualValue, expectedValue)) {
      errors.push(
        `Param mismatch for ${path}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
      );
    }
  }

  return errors;
}

function evaluateContainsParams(
  args: Record<string, unknown>,
  containsParams: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  for (const [path, expectedValue] of Object.entries(containsParams)) {
    const actualValue = getNestedValue(args, path);

    if (actualValue === undefined) {
      errors.push(`Missing expected param: ${path}`);
    } else if (!containsValue(actualValue, expectedValue)) {
      errors.push(
        `Param ${path} does not contain expected value: ${JSON.stringify(expectedValue)}`
      );
    }
  }

  return errors;
}

function evaluateForbiddenParams(
  args: Record<string, unknown>,
  forbiddenParams: string[]
): string[] {
  const errors: string[] = [];

  for (const path of forbiddenParams) {
    const actualValue = getNestedValue(args, path);
    if (actualValue !== undefined) {
      errors.push(`Forbidden param present: ${path} (found: ${JSON.stringify(actualValue)})`);
    }
  }

  return errors;
}

export function evaluateToolCalls(
  actualToolCalls: ToolCall[],
  expectedToolCalls: ExpectedToolCall[] | undefined
): ToolEvalResult {
  const errors: string[] = [];
  const paramErrors: string[] = [];
  const missingTools: string[] = [];
  const unexpectedTools: string[] = [];

  const actualTools = actualToolCalls.map((tc) => tc.name as ToolName);
  const expectedTools = (expectedToolCalls || [])
    .filter((etc) => !etc.shouldNotCall)
    .map((etc) => etc.name);

  const shouldNotCallTools = (expectedToolCalls || [])
    .filter((etc) => etc.shouldNotCall)
    .map((etc) => etc.name);

  for (const tool of shouldNotCallTools) {
    if (actualTools.includes(tool)) {
      errors.push(`Tool ${tool} was called but should not have been`);
      unexpectedTools.push(tool);
    }
  }

  if (expectedToolCalls?.length === 0) {
    if (actualToolCalls.length > 0) {
      errors.push(`Expected no tool calls, but got: ${actualTools.join(', ')}`);
      unexpectedTools.push(...actualTools);
    }
  } else if (expectedToolCalls) {
    for (const expected of expectedToolCalls) {
      if (expected.shouldNotCall) continue;

      const actualCall = actualToolCalls.find((tc) => tc.name === expected.name);

      if (!actualCall) {
        errors.push(`Expected tool ${expected.name} was not called`);
        missingTools.push(expected.name);
        continue;
      }

      const args = parseToolArguments(actualCall);

      if (expected.requiredParams) {
        const reqErrors = evaluateRequiredParams(args, expected.requiredParams);
        paramErrors.push(...reqErrors);
      }

      if (expected.containsParams) {
        const containsErrors = evaluateContainsParams(args, expected.containsParams);
        paramErrors.push(...containsErrors);
      }

      if (expected.forbiddenParams) {
        const forbiddenErrors = evaluateForbiddenParams(args, expected.forbiddenParams);
        paramErrors.push(...forbiddenErrors);
      }
    }

    for (const actual of actualTools) {
      if (!expectedTools.includes(actual) && !shouldNotCallTools.includes(actual)) {
        errors.push(`Unexpected tool called: ${actual}`);
        unexpectedTools.push(actual);
      }
    }
  }

  errors.push(...paramErrors);

  return {
    passed: errors.length === 0,
    expectedTools,
    actualTools,
    errors,
    details: {
      missingTools,
      unexpectedTools,
      paramErrors,
    },
  };
}
