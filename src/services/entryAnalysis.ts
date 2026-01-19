import type { JournalEntry } from '../types/entry';
import type { JournalInsight, InsightType, EmotionMetadata, PersonMetadata, EventMetadata, RelationshipSentiment } from '../types/analytics';
import { saveInsights, deleteEntryInsights } from './analytics';
import { markEntryAsProcessed, getUnprocessedEntries } from './entries';
import { getApiKey } from '../lib/secureStorage';
import { generateId } from '../utils/generators';
import { getTimestamp } from '../utils/date';

export interface ProcessingProgress {
  total: number;
  processed: number;
  currentEntry?: string;
  errors: Array<{ entryId: string; error: string }>;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const ANALYSIS_MODEL = 'gpt-4o-mini';

interface ExtractedEmotion {
  emotion: string;
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
}

interface ExtractedPerson {
  name: string;
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
}

type EventCategory = 'activity' | 'social' | 'work' | 'travel' | 'health' | 'entertainment' | 'other';

interface ExtractedEvent {
  event: string;
  category: EventCategory;
  sentiment: 'positive' | 'negative' | 'neutral';
  location?: string;
  participants?: string[];
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
}

interface AnalysisResult {
  emotions: ExtractedEmotion[];
  people: ExtractedPerson[];
  events: ExtractedEvent[];
}

const ANALYSIS_PROMPT = `You are an expert at analyzing journal entries to extract meaningful insights about emotions, people, and events/activities mentioned.

Analyze the following journal entry and extract:

1. **Emotions**: Identify emotions expressed by the author. For each emotion, provide:
   - emotion: The name of the emotion (e.g., "happy", "anxious", "excited", "frustrated")
   - intensity: A number from 1-10 indicating how strongly the emotion is expressed
   - trigger: What caused this emotion (optional, only if clearly stated)
   - sentiment: Whether this is "positive", "negative", or "neutral"
   - sourceText: The exact text from the entry that indicates this emotion
   - sourceStart: The character index where sourceText begins (0-indexed)
   - sourceEnd: The character index where sourceText ends (exclusive)

2. **People**: Identify people mentioned by name or relationship. For each person, provide:
   - name: The name or relationship term used (e.g., "Sarah", "Mom", "my boss")
   - relationship: The relationship to the author if mentioned (e.g., "friend", "mother", "coworker")
   - sentiment: The sentiment of the interaction - "positive", "negative", "neutral", "tense", or "mixed"
   - context: Brief context about the interaction (optional)
   - sourceText: The exact text from the entry that mentions this person
   - sourceStart: The character index where sourceText begins (0-indexed)
   - sourceEnd: The character index where sourceText ends (exclusive)

3. **Events/Activities**: Identify activities, events, or things the author did. For each event, provide:
   - event: A short descriptive name for the activity (e.g., "hiking", "dinner", "meeting", "workout", "movie night")
   - category: One of "activity", "social", "work", "travel", "health", "entertainment", or "other"
   - sentiment: The author's sentiment about this event - "positive", "negative", or "neutral"
   - location: Where the event took place (optional, only if mentioned)
   - participants: Array of people who participated (optional, only if mentioned)
   - sourceText: The exact text from the entry that describes this event
   - sourceStart: The character index where sourceText begins (0-indexed)
   - sourceEnd: The character index where sourceText ends (exclusive)

IMPORTANT:
- sourceStart and sourceEnd must be accurate character positions in the original text
- sourceText must be an exact substring of the entry content
- Only extract emotions that are clearly expressed, not implied
- Only extract people who are explicitly mentioned
- Only extract events that are explicitly described activities or occurrences
- If no emotions, people, or events are found, return empty arrays

Respond with a JSON object in this exact format:
{
  "emotions": [...],
  "people": [...],
  "events": [...]
}`;

/**
 * Generate a content hash for detecting entry modifications
 * Uses a simple but effective hash algorithm (djb2)
 */
export function generateContentHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Analyze a single journal entry and extract insights using AI
 */
export async function analyzeEntry(entry: JournalEntry): Promise<JournalInsight[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
  }

  // Skip empty entries
  if (!entry.content || entry.content.trim().length === 0) {
    return [];
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: `Journal Entry:\n\n${entry.content}` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `API error (${response.status})`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from AI');
  }

  let analysisResult: AnalysisResult;
  try {
    analysisResult = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }

  // Validate and fix source positions
  const validatedEmotions = validateSourcePositions(analysisResult.emotions || [], entry.content);
  const validatedPeople = validateSourcePositions(analysisResult.people || [], entry.content);
  const validatedEvents = validateSourcePositions(analysisResult.events || [], entry.content);

  // Convert to JournalInsight format
  const insights: JournalInsight[] = [];
  const timestamp = getTimestamp();

  for (const emotion of validatedEmotions) {
    const metadata: EmotionMetadata = {
      intensity: emotion.intensity,
      trigger: emotion.trigger,
      sentiment: emotion.sentiment,
      source: {
        start: emotion.sourceStart,
        end: emotion.sourceEnd,
        quote: emotion.sourceText,
      },
    };

    insights.push({
      id: generateId(),
      entryId: entry.id,
      entryDate: entry.date,
      insightType: 'emotion' as InsightType,
      content: emotion.emotion.toLowerCase(),
      metadata,
      createdAt: timestamp,
      sourceText: emotion.sourceText,
      sourceStart: emotion.sourceStart,
      sourceEnd: emotion.sourceEnd,
    });
  }

  for (const person of validatedPeople) {
    const metadata: PersonMetadata = {
      relationship: person.relationship,
      sentiment: person.sentiment,
      context: person.context,
      source: {
        start: person.sourceStart,
        end: person.sourceEnd,
        quote: person.sourceText,
      },
    };

    insights.push({
      id: generateId(),
      entryId: entry.id,
      entryDate: entry.date,
      insightType: 'person' as InsightType,
      content: person.name,
      metadata,
      createdAt: timestamp,
      sourceText: person.sourceText,
      sourceStart: person.sourceStart,
      sourceEnd: person.sourceEnd,
    });
  }

  for (const event of validatedEvents) {
    const metadata: EventMetadata = {
      category: event.category,
      sentiment: event.sentiment,
      location: event.location,
      participants: event.participants,
      source: {
        start: event.sourceStart,
        end: event.sourceEnd,
        quote: event.sourceText,
      },
    };

    insights.push({
      id: generateId(),
      entryId: entry.id,
      entryDate: entry.date,
      insightType: 'event' as InsightType,
      content: event.event.toLowerCase(),
      metadata,
      createdAt: timestamp,
      sourceText: event.sourceText,
      sourceStart: event.sourceStart,
      sourceEnd: event.sourceEnd,
    });
  }

  // Deduplicate insights by (insightType, normalizedContent) within this entry
  // Keep the first occurrence (earliest source position) for each unique insight
  const deduplicatedInsights = deduplicateInsights(insights);

  return deduplicatedInsights;
}

/**
 * Validate and fix source positions to ensure they're accurate
 */
function validateSourcePositions<T extends { sourceText: string; sourceStart: number; sourceEnd: number }>(
  items: T[],
  content: string
): T[] {
  return items.map(item => {
    // Try to find the exact sourceText in the content
    const actualIndex = content.indexOf(item.sourceText);

    if (actualIndex !== -1) {
      // Found exact match, use correct positions
      return {
        ...item,
        sourceStart: actualIndex,
        sourceEnd: actualIndex + item.sourceText.length,
      };
    }

    // If exact match not found, try case-insensitive search
    const lowerContent = content.toLowerCase();
    const lowerSourceText = item.sourceText.toLowerCase();
    const caseInsensitiveIndex = lowerContent.indexOf(lowerSourceText);

    if (caseInsensitiveIndex !== -1) {
      // Use the actual text from the content
      const actualText = content.substring(caseInsensitiveIndex, caseInsensitiveIndex + item.sourceText.length);
      return {
        ...item,
        sourceText: actualText,
        sourceStart: caseInsensitiveIndex,
        sourceEnd: caseInsensitiveIndex + actualText.length,
      };
    }

    // If still not found, try to use the provided positions if they're valid
    if (item.sourceStart >= 0 && item.sourceEnd <= content.length && item.sourceStart < item.sourceEnd) {
      const actualText = content.substring(item.sourceStart, item.sourceEnd);
      return {
        ...item,
        sourceText: actualText,
      };
    }

    // Last resort: use the whole content
    return {
      ...item,
      sourceText: content.substring(0, Math.min(100, content.length)),
      sourceStart: 0,
      sourceEnd: Math.min(100, content.length),
    };
  });
}

/**
 * Deduplicate insights by (insightType, normalizedContent).
 * Keeps the first occurrence (earliest source position) for each unique insight.
 * This prevents duplicate entries when the same emotion/person/event is mentioned
 * multiple times in a single journal entry.
 */
function deduplicateInsights(insights: JournalInsight[]): JournalInsight[] {
  const seen = new Map<string, JournalInsight>();

  // Sort by source position to ensure we keep the first occurrence
  const sorted = [...insights].sort((a, b) => (a.sourceStart ?? 0) - (b.sourceStart ?? 0));

  for (const insight of sorted) {
    // Create a unique key from insightType + normalized content
    const normalizedContent = insight.content.toLowerCase().trim();
    const key = `${insight.insightType}:${normalizedContent}`;

    // Only keep the first occurrence
    if (!seen.has(key)) {
      seen.set(key, insight);
    }
  }

  return Array.from(seen.values());
}

/**
 * Process a single entry: analyze it, save insights, and mark as processed
 */
export async function processEntry(entry: JournalEntry): Promise<JournalInsight[]> {
  // Delete any existing insights for this entry
  await deleteEntryInsights(entry.id);

  // Analyze the entry
  const insights = await analyzeEntry(entry);

  // Save the new insights
  if (insights.length > 0) {
    await saveInsights(insights);
  }

  // Mark entry as processed with content hash
  const contentHash = generateContentHash(entry.content);
  await markEntryAsProcessed(entry.id, contentHash);

  // Notify UI of insights change
  window.dispatchEvent(new CustomEvent('insights-changed'));

  return insights;
}

/**
 * Check if an entry has been modified since it was last processed
 */
export function hasEntryBeenModified(entry: JournalEntry): boolean {
  if (!entry.contentHash) {
    return true; // Never processed
  }
  const currentHash = generateContentHash(entry.content);
  return currentHash !== entry.contentHash;
}

/**
 * Process all unprocessed entries on app launch.
 * This is called once when the app starts to analyze any entries
 * that haven't been processed yet. It handles both:
 * - New entries (never processed, no content_hash)
 * - Modified entries (have content_hash but were marked for reprocessing)
 *
 * @param onProgress - Optional callback to receive progress updates
 * @returns Processing results including any errors
 */
export async function processUnprocessedEntriesOnLaunch(
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessingProgress> {
  const progress: ProcessingProgress = {
    total: 0,
    processed: 0,
    errors: [],
  };

  // Check if API key is configured
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('[EntryAnalysis] Skipping launch processing - no API key configured');
    return progress;
  }

  // Get all unprocessed entries (includes both new and modified entries)
  const unprocessedEntries = await getUnprocessedEntries();
  progress.total = unprocessedEntries.length;

  if (unprocessedEntries.length === 0) {
    console.log('[EntryAnalysis] No unprocessed entries found on launch');
    return progress;
  }

  // Categorize entries: modified (have content_hash) vs new (no content_hash)
  const modifiedEntries = unprocessedEntries.filter(e => e.contentHash !== null && e.contentHash !== undefined);
  const newEntries = unprocessedEntries.filter(e => e.contentHash === null || e.contentHash === undefined);

  console.log(`[EntryAnalysis] Found ${unprocessedEntries.length} entries to process on launch:`);
  console.log(`[EntryAnalysis]   - ${modifiedEntries.length} modified entries (will delete old insights and re-analyze)`);
  console.log(`[EntryAnalysis]   - ${newEntries.length} new entries (first-time analysis)`);

  onProgress?.(progress);

  // Process entries one by one
  for (const entry of unprocessedEntries) {
    progress.currentEntry = entry.id;
    onProgress?.(progress);

    try {
      // Skip empty entries
      if (!entry.content || entry.content.trim().length === 0) {
        console.log(`[EntryAnalysis] Skipping empty entry ${entry.id}`);
        progress.processed++;
        continue;
      }

      const isModified = entry.contentHash !== null && entry.contentHash !== undefined;
      await processEntry(entry);
      progress.processed++;
      console.log(`[EntryAnalysis] Processed ${isModified ? 'modified' : 'new'} entry ${entry.id} (${progress.processed}/${progress.total})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[EntryAnalysis] Failed to process entry ${entry.id}:`, errorMessage);
      progress.errors.push({ entryId: entry.id, error: errorMessage });
      // Continue processing other entries even if one fails
    }

    onProgress?.(progress);
  }

  progress.currentEntry = undefined;
  onProgress?.(progress);

  console.log(`[EntryAnalysis] Launch processing complete: ${progress.processed} processed, ${progress.errors.length} errors`);
  return progress;
}
