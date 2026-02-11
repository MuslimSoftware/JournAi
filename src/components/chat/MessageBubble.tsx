import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoDocumentText,
  IoChevronDown,
  IoChevronUp,
  IoCodeSlash,
} from "react-icons/io5";
import { Streamdown } from "streamdown";
import { useTheme } from "../../contexts/ThemeContext";
import { useEntryNavigation } from "../../contexts/EntryNavigationContext";
import { ChatMessage } from "../../types/chat";
import { Spinner } from "../themed";
import ThinkingIndicator from "./ThinkingIndicator";
import ToolCallDisplay from "./ToolCallDisplay";
import { getEntriesByIds } from "../../services/entries";
import type { JournalEntry } from "../../types/entry";
import "../../styles/chat.css";

const streamdownComponents = {
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 700 }}>{children}</strong>
  ),
  b: ({ children }: { children?: React.ReactNode }) => (
    <b style={{ fontWeight: 700 }}>{children}</b>
  ),
};

interface StreamingBubbleProps {
  children: React.ReactNode;
  className: string;
  style: React.CSSProperties;
  isStreaming: boolean;
}

function StreamingBubble({
  children,
  className,
  style,
  isStreaming,
}: StreamingBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreaming || !ref.current) return;

    const container = ref.current;
    const cursorId = "streaming-cursor";

    // Remove existing cursor
    const existingCursor = container.querySelector(`#${cursorId}`);
    if (existingCursor) existingCursor.remove();

    // Find the last text node
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    );
    let lastTextNode: Text | null = null;
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent?.trim()) {
        lastTextNode = node;
      }
    }

    if (lastTextNode && lastTextNode.parentElement) {
      const cursor = document.createElement("span");
      cursor.id = cursorId;
      cursor.className = "streaming-cursor";
      cursor.textContent = "▋";
      lastTextNode.parentElement.appendChild(cursor);
    }

    return () => {
      const cursor = container.querySelector(`#${cursorId}`);
      if (cursor) cursor.remove();
    };
  }, [isStreaming, children]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onToggleThinking?: () => void;
}

const INTENSITY_BAR_COUNT = 10;

function IntensityBars({
  intensity,
  sentiment,
}: {
  intensity: number;
  sentiment: string;
}) {
  return (
    <div className="chat-intensity-bars">
      {Array.from({ length: INTENSITY_BAR_COUNT }, (_, i) => {
        const fullBars = Math.floor(intensity);
        const partialFill = intensity % 1;
        const isPartial = i === fullBars && partialFill > 0;
        const isFull = i < fullBars;

        if (isPartial) {
          return (
            <div
              key={i}
              className="chat-intensity-bar"
              style={{
                background: `linear-gradient(to right, var(--insights-intensity-${sentiment}) ${partialFill * 100}%, var(--bg-primary) ${partialFill * 100}%)`,
              }}
            />
          );
        }
        return (
          <div
            key={i}
            className={
              isFull
                ? `chat-intensity-bar chat-intensity-bar--filled-${sentiment}`
                : "chat-intensity-bar"
            }
          />
        );
      })}
    </div>
  );
}

function getSentimentClass(sentiment?: string): string {
  if (sentiment === "positive" || sentiment === "supportive") return "positive";
  if (sentiment === "negative" || sentiment === "tense") return "negative";
  return "neutral";
}

export default function MessageBubble({
  message,
  onToggleThinking,
}: MessageBubbleProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { navigateToEntry } = useEntryNavigation();
  const [showCitations, setShowCitations] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [citedEntries, setCitedEntries] = useState<JournalEntry[]>([]);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const isUser = message.role === "user";
  const hasContent = message.content.length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasCitations = message.citations && message.citations.length > 0;
  const hasInsights =
    message.ragContext?.insights && message.ragContext.insights.length > 0;
  const hasSources = hasCitations || hasInsights;
  const hasContext = message.ragContext?.contextText;
  const allToolsCompleted =
    hasToolCalls && message.toolCalls!.every((tc) => tc.status === "completed");

  // Show thinking/calling indicator until first content chunk arrives
  const showThinkingIndicator = !isUser && message.isStreaming && !hasContent;
  const showCallingToolsIndicator = hasToolCalls && !allToolsCompleted;

  const isError = message.status === "error";

  useEffect(() => {
    if (showCitations && hasCitations && citedEntries.length === 0) {
      setLoadingCitations(true);
      const entryIds = message.citations!.map((c) => c.entryId);
      getEntriesByIds(entryIds)
        .then((entries) => setCitedEntries(entries))
        .catch(console.error)
        .finally(() => setLoadingCitations(false));
    }
  }, [showCitations, hasCitations, message.citations, citedEntries.length]);

  const containerClass = `chat-message-container ${isUser ? "chat-message-container--user" : "chat-message-container--assistant"}`;

  const getBubbleClass = () => {
    let classes = "chat-bubble";
    if (isUser) {
      classes += " chat-bubble--user";
    } else {
      classes += " chat-bubble--assistant";
      if (message.isStreaming) {
        classes += " chat-bubble--streaming";
      }
    }
    if (isError) {
      classes += " chat-bubble--error";
    }
    return classes;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={containerClass} style={{ gap: theme.spacing.xs }}>
      {/* TOOL CALLS - ALWAYS FIRST */}
      {hasToolCalls && <ToolCallDisplay toolCalls={message.toolCalls!} />}

      {/* THINKING/CALLING INDICATOR */}
      {showThinkingIndicator && (
        <div
          className="chat-bubble chat-bubble--assistant chat-bubble--thinking"
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            gap: theme.spacing.sm,
          }}
        >
          <Spinner size="sm" />
          <span>
            {showCallingToolsIndicator ? "Calling tools..." : "Thinking..."}
          </span>
        </div>
      )}

      {/* CONTENT - ALWAYS LAST */}
      {hasContent && (
        <StreamingBubble
          className={getBubbleClass()}
          style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}` }}
          isStreaming={!isUser && !!message.isStreaming}
        >
          {isUser ? (
            message.content
          ) : (
            <Streamdown
              className="streamdown"
              components={streamdownComponents}
              mode={message.isStreaming ? "streaming" : "static"}
            >
              {message.content}
            </Streamdown>
          )}
        </StreamingBubble>
      )}
      {hasContent && !isUser && (hasSources || hasContext) && (
        <div className="chat-message-actions">
          {hasSources && (
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="chat-action-button"
            >
              <IoDocumentText size={12} />
              Sources
              {showCitations ? (
                <IoChevronUp size={12} />
              ) : (
                <IoChevronDown size={12} />
              )}
            </button>
          )}
          {hasContext && (
            <button
              onClick={() => setShowContext(!showContext)}
              className="chat-action-button"
            >
              <IoCodeSlash size={12} />
              Context
              {showContext ? (
                <IoChevronUp size={12} />
              ) : (
                <IoChevronDown size={12} />
              )}
            </button>
          )}
        </div>
      )}
      {showCitations && hasSources && (
        <div
          className="chat-sources-panel"
          style={{ padding: theme.spacing.sm }}
        >
          {hasInsights && (
            <div>
              <div className="chat-sources-section__title">Insights</div>
              <div className="chat-sources-list">
                {message
                  .ragContext!.insights!.slice(0, 10)
                  .map((insight, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const sourceRange =
                          insight.sourceText != null &&
                          insight.sourceStart != null &&
                          insight.sourceEnd != null
                            ? {
                                quote: insight.sourceText,
                                start: insight.sourceStart,
                                end: insight.sourceEnd,
                              }
                            : undefined;
                        navigateToEntry(insight.entryId, sourceRange);
                        navigate("/entries");
                      }}
                      className="chat-insight-card"
                    >
                      <div className="chat-insight-card__top">
                        <span className="chat-insight-card__name">
                          {insight.type === "emotion"
                            ? insight.emotion
                            : insight.name}
                        </span>
                        {insight.type === "emotion" && (
                          <div className="chat-insight-card__intensity-group">
                            <span className="chat-insight-card__intensity-value">
                              {insight.intensity}/10
                            </span>
                            <IntensityBars
                              intensity={insight.intensity}
                              sentiment={insight.sentiment}
                            />
                          </div>
                        )}
                        {insight.type === "person" && insight.sentiment && (
                          <span
                            className={`chat-insight-pill chat-insight-pill--${getSentimentClass(insight.sentiment)}`}
                          >
                            {insight.sentiment}
                          </span>
                        )}
                        <span className="chat-insight-card__date">
                          {insight.entryDate}
                        </span>
                      </div>
                      {insight.sourceText && (
                        <div className="chat-insight-card__quote">
                          {insight.sourceText}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
          {hasCitations && (
            <div>
              <div className="chat-sources-section__title">Journal Entries</div>
              {loadingCitations ? (
                <div className="chat-loading-entries">
                  <Spinner size="sm" /> Loading entries...
                </div>
              ) : citedEntries.length > 0 ? (
                <div className="chat-sources-list">
                  {citedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => {
                        navigateToEntry(entry.id);
                        navigate("/entries");
                      }}
                      className="chat-entry-card"
                    >
                      <div className="chat-entry-card__date">{entry.date}</div>
                      <div className="chat-entry-card__preview">
                        {entry.preview ||
                          entry.content.slice(0, 200) +
                            (entry.content.length > 200 ? "..." : "")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="chat-no-entries">
                  Referenced entries no longer exist.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {showContext && hasContext && (
        <div
          className="chat-context-panel"
          style={{ padding: theme.spacing.sm }}
        >
          <div className="chat-context-panel__title">
            Context Injected into Prompt
          </div>
          <pre className="chat-context-panel__code">
            {message.ragContext?.contextText}
          </pre>
        </div>
      )}
      {message.thinking && (
        <ThinkingIndicator
          thinking={message.thinking}
          onToggle={onToggleThinking}
        />
      )}
      {hasContent && (
        <span
          className="chat-message-time"
          style={{ padding: `0 ${theme.spacing.xs}` }}
        >
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
}
