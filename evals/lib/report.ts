import type { EvalRunResult, TestCaseResult } from './types';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function pass(text: string): string {
  return `${COLORS.green}✓ ${text}${COLORS.reset}`;
}

function fail(text: string): string {
  return `${COLORS.red}✗ ${text}${COLORS.reset}`;
}

function formatTestResult(result: TestCaseResult, verbose: boolean): string {
  const lines: string[] = [];
  const status =
    (result.toolEval?.passed ?? true) && (result.qualityEval?.passed ?? true);

  const borderColor = status ? COLORS.green : COLORS.red;
  const statusIcon = status ? pass('PASS') : fail('FAIL');

  lines.push(`${borderColor}┌─────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);
  lines.push(`${borderColor}│${COLORS.reset} ${statusIcon} ${COLORS.bold}${result.testCase.id}:${COLORS.reset} ${result.testCase.name}`);
  lines.push(`${borderColor}├─────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);

  if (!status || verbose) {
    lines.push(`${borderColor}│${COLORS.reset}`);
    lines.push(`${borderColor}│${COLORS.reset}   ${COLORS.cyan}Input:${COLORS.reset}    "${result.testCase.input}"`);

    if (result.response) {
      const truncatedResponse = result.response.slice(0, 200);
      lines.push(`${borderColor}│${COLORS.reset}   ${COLORS.cyan}Response:${COLORS.reset} "${truncatedResponse}${result.response.length > 200 ? '...' : ''}"`);
    }

    if (result.error) {
      lines.push(`${borderColor}│${COLORS.reset}   ${COLORS.red}Error:${COLORS.reset}    ${result.error}`);
    }

    lines.push(`${borderColor}│${COLORS.reset}`);

    if (result.toolEval) {
      const toolStatus = result.toolEval.passed
        ? `${COLORS.green}PASSED${COLORS.reset}`
        : `${COLORS.red}FAILED${COLORS.reset}`;
      lines.push(`${borderColor}│${COLORS.reset}   ${COLORS.bold}Tool Routing:${COLORS.reset} ${toolStatus}`);
      lines.push(`${borderColor}│${COLORS.reset}     Expected: [${result.toolEval.expectedTools.join(', ') || 'none'}]`);
      lines.push(`${borderColor}│${COLORS.reset}     Actual:   [${result.toolEval.actualTools.join(', ') || 'none'}]`);

      if (result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          lines.push(`${borderColor}│${COLORS.reset}     ${COLORS.cyan}${toolCall.name}:${COLORS.reset}`);
          try {
            const args = JSON.parse(toolCall.arguments);
            const prettyArgs = JSON.stringify(args, null, 2);
            for (const line of prettyArgs.split('\n')) {
              lines.push(`${borderColor}│${COLORS.reset}       ${COLORS.dim}${line}${COLORS.reset}`);
            }
          } catch {
            lines.push(`${borderColor}│${COLORS.reset}       ${COLORS.dim}${toolCall.arguments}${COLORS.reset}`);
          }
        }
      }

      if (result.toolEval.errors.length > 0) {
        for (const error of result.toolEval.errors) {
          lines.push(`${borderColor}│${COLORS.reset}     ${COLORS.red}• ${error}${COLORS.reset}`);
        }
      }
    }

    if (result.qualityEval) {
      lines.push(`${borderColor}│${COLORS.reset}`);
      const qualityStatus = result.qualityEval.passed
        ? `${COLORS.green}PASSED${COLORS.reset}`
        : `${COLORS.red}FAILED${COLORS.reset}`;
      lines.push(
        `${borderColor}│${COLORS.reset}   ${COLORS.bold}Quality:${COLORS.reset} ${qualityStatus} (${result.qualityEval.score.overall}/100)`
      );
      lines.push(
        `${borderColor}│${COLORS.reset}     ${COLORS.dim}Relevance: ${result.qualityEval.score.relevance}/5 | Accuracy: ${result.qualityEval.score.accuracy}/5 | Empathy: ${result.qualityEval.score.empathy}/5 | Completeness: ${result.qualityEval.score.completeness}/5${COLORS.reset}`
      );

      if (verbose && result.qualityEval.score.reasoning) {
        lines.push(`${borderColor}│${COLORS.reset}     ${COLORS.dim}Reasoning: ${result.qualityEval.score.reasoning}${COLORS.reset}`);
      }

      if (result.qualityEval.errors.length > 0) {
        for (const error of result.qualityEval.errors) {
          lines.push(`${borderColor}│${COLORS.reset}     ${COLORS.red}• ${error}${COLORS.reset}`);
        }
      }
    }

    lines.push(`${borderColor}│${COLORS.reset}`);
    lines.push(`${borderColor}│${COLORS.reset}   ${COLORS.dim}Duration: ${formatDuration(result.durationMs)}${COLORS.reset}`);
  }

  lines.push(`${borderColor}└─────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);
  lines.push('');

  return lines.join('\n');
}

export function formatConsoleReport(
  results: EvalRunResult,
  verbose: boolean = false
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(
    `${COLORS.bold}${COLORS.cyan}═══════════════════════════════════════════════════════════${COLORS.reset}`
  );
  lines.push(
    `${COLORS.bold}  Eval Results: ${results.datasetName}${COLORS.reset}`
  );
  lines.push(
    `${COLORS.dim}  ${results.timestamp}${COLORS.reset}`
  );
  lines.push(
    `${COLORS.bold}${COLORS.cyan}═══════════════════════════════════════════════════════════${COLORS.reset}`
  );
  lines.push('');

  for (const result of results.results) {
    lines.push(formatTestResult(result, verbose));
  }

  lines.push('');
  lines.push(
    `${COLORS.bold}${COLORS.cyan}───────────────────────────────────────────────────────────${COLORS.reset}`
  );
  lines.push(`${COLORS.bold}  Summary${COLORS.reset}`);
  lines.push(
    `${COLORS.bold}${COLORS.cyan}───────────────────────────────────────────────────────────${COLORS.reset}`
  );

  const passRate = results.passedTests / results.totalTests;
  const passColor = passRate >= 0.8 ? COLORS.green : passRate >= 0.5 ? COLORS.yellow : COLORS.red;

  lines.push(`  Total tests:      ${results.totalTests}`);
  lines.push(
    `  Passed:           ${passColor}${results.passedTests}${COLORS.reset} (${formatPercent(passRate)})`
  );
  lines.push(
    `  Failed:           ${results.failedTests > 0 ? COLORS.red : COLORS.dim}${results.failedTests}${COLORS.reset}`
  );
  lines.push(`  Tool accuracy:    ${formatPercent(results.toolAccuracy)}`);

  if (results.avgQualityScore > 0) {
    lines.push(`  Avg quality:      ${results.avgQualityScore.toFixed(1)}/100`);
  }

  lines.push(`  Duration:         ${formatDuration(results.durationMs)}`);
  lines.push('');

  return lines.join('\n');
}

export function formatJsonReport(results: EvalRunResult): string {
  return JSON.stringify(results, null, 2);
}
