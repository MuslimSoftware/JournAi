import type { OpenAIMessage, ToolCall } from '../../src/types/chat';
import type { ToolName } from '../../src/services/agentTools';

export type { ToolName };

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExpectedToolCall {
  name: ToolName;
  requiredParams?: Record<string, unknown>;
  containsParams?: Record<string, unknown>;
  forbiddenParams?: string[];
  shouldNotCall?: boolean;
}

export interface QualityCriteria {
  intent: string;
  mustInclude?: string[];
  mustNotInclude?: string[];
  tone?: 'empathetic' | 'informative' | 'conversational';
  shouldCiteEntries?: boolean;
}

export interface EvalTestCase {
  id: string;
  name: string;
  input: string;
  conversation?: ConversationTurn[];
  expectedToolCalls?: ExpectedToolCall[];
  qualityCriteria?: QualityCriteria;
  tags?: string[];
}

export interface EvalDataset {
  name: string;
  testCases: EvalTestCase[];
}

export interface ToolEvalResult {
  passed: boolean;
  expectedTools: string[];
  actualTools: string[];
  errors: string[];
  details: {
    missingTools: string[];
    unexpectedTools: string[];
    paramErrors: string[];
  };
}

export interface QualityScore {
  relevance: number;
  accuracy: number;
  empathy: number;
  completeness: number;
  overall: number;
  reasoning: string;
}

export interface QualityEvalResult {
  passed: boolean;
  score: QualityScore;
  errors: string[];
}

export interface TestCaseResult {
  testCase: EvalTestCase;
  toolEval?: ToolEvalResult;
  qualityEval?: QualityEvalResult;
  response: string;
  toolCalls: ToolCall[];
  durationMs: number;
  error?: string;
}

export interface EvalRunResult {
  datasetName: string;
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  toolAccuracy: number;
  avgQualityScore: number;
  results: TestCaseResult[];
  durationMs: number;
}

export interface AgentResponse {
  response: string;
  toolCalls: ToolCall[];
}
