import type { QualityCriteria, QualityScore, QualityEvalResult } from './types';

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for a journaling AI assistant. Your job is to score the quality of AI responses based on specific criteria.

You will be given:
1. The user's message
2. The AI's response
3. Quality criteria to evaluate against
4. Whether tool results were available (for context)

Score each dimension from 1-5:
- 1: Poor - Does not meet expectations
- 2: Below Average - Partially meets expectations
- 3: Average - Meets basic expectations
- 4: Good - Exceeds expectations
- 5: Excellent - Significantly exceeds expectations

Respond with a JSON object containing:
{
  "relevance": <1-5>,
  "accuracy": <1-5>,
  "empathy": <1-5>,
  "completeness": <1-5>,
  "reasoning": "<brief explanation of scores>"
}`;

function buildJudgePrompt(
  userMessage: string,
  aiResponse: string,
  criteria: QualityCriteria,
  hasToolResults: boolean
): string {
  const criteriaText = [
    `Intent: ${criteria.intent}`,
    criteria.mustInclude?.length
      ? `Must include: ${criteria.mustInclude.join(', ')}`
      : null,
    criteria.mustNotInclude?.length
      ? `Must NOT include: ${criteria.mustNotInclude.join(', ')}`
      : null,
    criteria.tone ? `Expected tone: ${criteria.tone}` : null,
    criteria.shouldCiteEntries
      ? 'Should cite specific journal entries'
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `User message: "${userMessage}"

AI response: "${aiResponse}"

Quality criteria:
${criteriaText}

Tool results were ${hasToolResults ? 'available' : 'not available'} for this response.

Evaluate the response and provide scores. Consider:
- Relevance: Does it address the user's question/need?
- Accuracy: Is the information grounded in data (no hallucination)?
- Empathy: Is the tone appropriate for a journaling assistant?
- Completeness: Does it cover the key points from the criteria?

Respond with JSON only.`;
}

async function callJudgeLLM(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<QualityScore> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Judge LLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in judge response');
  }

  const parsed = JSON.parse(content);

  const scores = {
    relevance: Math.max(1, Math.min(5, parsed.relevance || 3)),
    accuracy: Math.max(1, Math.min(5, parsed.accuracy || 3)),
    empathy: Math.max(1, Math.min(5, parsed.empathy || 3)),
    completeness: Math.max(1, Math.min(5, parsed.completeness || 3)),
    reasoning: parsed.reasoning || 'No reasoning provided',
  };

  const overall =
    ((scores.relevance + scores.accuracy + scores.empathy + scores.completeness) / 4) *
    20;

  return {
    ...scores,
    overall: Math.round(overall),
  };
}

export async function evaluateQuality(
  userMessage: string,
  aiResponse: string,
  criteria: QualityCriteria,
  hasToolResults: boolean,
  apiKey: string
): Promise<QualityEvalResult> {
  const errors: string[] = [];

  try {
    const prompt = buildJudgePrompt(userMessage, aiResponse, criteria, hasToolResults);
    const score = await callJudgeLLM(JUDGE_SYSTEM_PROMPT, prompt, apiKey);

    const PASS_THRESHOLD = 60;
    const passed = score.overall >= PASS_THRESHOLD && errors.length === 0;

    return {
      passed,
      score,
      errors,
    };
  } catch (error) {
    return {
      passed: false,
      score: {
        relevance: 0,
        accuracy: 0,
        empathy: 0,
        completeness: 0,
        overall: 0,
        reasoning: `Judge evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      errors: [...errors, `Judge evaluation failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
