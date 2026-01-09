import { CSSProperties, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoDocumentText, IoChevronDown, IoChevronUp, IoCodeSlash } from 'react-icons/io5';
import { Streamdown } from 'streamdown';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatMessage } from '../../types/chat';
import { Spinner } from '../themed';
import ThinkingIndicator from './ThinkingIndicator';
import ToolCallDisplay from './ToolCallDisplay';
import { CHAT } from './constants';
import { getEntriesByIds } from '../../services/entries';
import type { JournalEntry } from '../../types/entry';

const streamdownComponents = {
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 700 }}>{children}</strong>
  ),
  b: ({ children }: { children?: React.ReactNode }) => (
    <b style={{ fontWeight: 700 }}>{children}</b>
  ),
};

interface MessageBubbleProps {
  message: ChatMessage;
  onToggleThinking?: () => void;
}

export default function MessageBubble({ message, onToggleThinking }: MessageBubbleProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [citedEntries, setCitedEntries] = useState<JournalEntry[]>([]);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const isUser = message.role === 'user';
  const hasContent = message.content.length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasCitations = message.citations && message.citations.length > 0;
  const hasContext = message.ragContext?.contextText;
  const showThinkingIndicator = !isUser && message.isStreaming && !hasContent && !hasToolCalls;

  useEffect(() => {
    if (showCitations && hasCitations && citedEntries.length === 0) {
      setLoadingCitations(true);
      const entryIds = message.citations!.map(c => c.entryId);
      getEntriesByIds(entryIds)
        .then(entries => setCitedEntries(entries))
        .catch(console.error)
        .finally(() => setLoadingCitations(false));
    }
  }, [showCitations, hasCitations, message.citations, citedEntries.length]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
    gap: theme.spacing.xs,
    maxWidth: '100%',
  };

  const bubbleStyle: CSSProperties = {
    maxWidth: CHAT.bubble.maxWidth,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: isUser ? CHAT.bubble.userRadius : CHAT.bubble.assistantRadius,
    backgroundColor: isUser ? theme.colors.text.primary : theme.colors.background.secondary,
    color: isUser ? theme.colors.background.primary : theme.colors.text.primary,
    fontSize: CHAT.fontSize.message,
    lineHeight: '1.5',
    wordBreak: 'break-word',
  };

  const thinkingBubbleStyle: CSSProperties = {
    ...bubbleStyle,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    color: theme.colors.text.muted,
  };

  const timeStyle: CSSProperties = {
    fontSize: CHAT.fontSize.xxsmall,
    color: theme.colors.text.muted,
    padding: `0 ${theme.spacing.xs}`,
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={containerStyle}>
      {showThinkingIndicator && (
        <div style={thinkingBubbleStyle}>
          <Spinner size="sm" />
          <span>Thinking...</span>
        </div>
      )}
      {hasToolCalls && <ToolCallDisplay toolCalls={message.toolCalls!} />}
      {hasContent && (
        <div style={bubbleStyle}>
          {isUser ? (
            message.content
          ) : showRaw ? (
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', fontSize: '0.85em' }}>
              {message.content}
            </pre>
          ) : (
            <Streamdown className="streamdown" components={streamdownComponents}>{message.content}</Streamdown>
          )}
        </div>
      )}
      {hasContent && !isUser && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowRaw(!showRaw)}
            style={{
              background: 'none',
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.7em',
              color: theme.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            {showRaw ? 'Show Rendered' : 'Show Raw'}
          </button>
          {hasCitations && (
            <button
              onClick={() => setShowCitations(!showCitations)}
              style={{
                background: 'none',
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.7em',
                color: theme.colors.text.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IoDocumentText size={12} />
              {message.citations!.length} source{message.citations!.length !== 1 ? 's' : ''}
              {showCitations ? <IoChevronUp size={12} /> : <IoChevronDown size={12} />}
            </button>
          )}
          {hasContext && (
            <button
              onClick={() => setShowContext(!showContext)}
              style={{
                background: 'none',
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.7em',
                color: theme.colors.text.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IoCodeSlash size={12} />
              Context
              {showContext ? <IoChevronUp size={12} /> : <IoChevronDown size={12} />}
            </button>
          )}
        </div>
      )}
      {showCitations && hasCitations && (
        <div
          style={{
            maxWidth: CHAT.bubble.maxWidth,
            padding: theme.spacing.sm,
            borderRadius: '8px',
            backgroundColor: theme.colors.background.subtle,
            border: `1px solid ${theme.colors.border.primary}`,
            fontSize: '0.8em',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', color: theme.colors.text.secondary }}>
            Referenced Journal Entries
          </div>
          {loadingCitations ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.text.muted }}>
              <Spinner size="sm" /> Loading entries...
            </div>
          ) : citedEntries.length > 0 ? (
            citedEntries.map((entry, idx) => (
              <div
                key={entry.id}
                onClick={() => navigate(`/entries?id=${entry.id}`)}
                onMouseEnter={() => setHoveredEntryId(entry.id)}
                onMouseLeave={() => setHoveredEntryId(null)}
                style={{
                  padding: '8px',
                  marginBottom: idx < citedEntries.length - 1 ? '8px' : 0,
                  borderRadius: '6px',
                  backgroundColor: hoveredEntryId === entry.id
                    ? theme.colors.background.secondary
                    : theme.colors.background.primary,
                  border: `1px solid ${theme.colors.border.primary}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 500, color: theme.colors.text.primary, marginBottom: '4px' }}>
                  {entry.date}
                </div>
                <div style={{ color: theme.colors.text.muted, fontSize: '0.9em', lineHeight: '1.4' }}>
                  {entry.preview || entry.content.slice(0, 200) + (entry.content.length > 200 ? '...' : '')}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: theme.colors.text.muted }}>
              Referenced entries no longer exist.
            </div>
          )}
        </div>
      )}
      {showContext && hasContext && (
        <div
          style={{
            maxWidth: CHAT.bubble.maxWidth,
            padding: theme.spacing.sm,
            borderRadius: '8px',
            backgroundColor: theme.colors.background.subtle,
            border: `1px solid ${theme.colors.border.primary}`,
            fontSize: '0.8em',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', color: theme.colors.text.secondary }}>
            Context Injected into Prompt
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: theme.colors.background.primary,
              border: `1px solid ${theme.colors.border.primary}`,
              color: theme.colors.text.muted,
              fontSize: '0.85em',
              lineHeight: '1.5',
              fontFamily: 'monospace',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {message.ragContext?.contextText}
          </pre>
        </div>
      )}
      {message.thinking && (
        <ThinkingIndicator thinking={message.thinking} onToggle={onToggleThinking} />
      )}
      {hasContent && <span style={timeStyle}>{formatTime(message.timestamp)}</span>}
    </div>
  );
}
