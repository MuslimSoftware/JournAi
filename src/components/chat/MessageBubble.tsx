import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatMessage } from '../../types/chat';
import ThinkingIndicator from './ThinkingIndicator';
import ToolCallDisplay from './ToolCallDisplay';
import StreamingText from './StreamingText';
import { Spinner } from '../themed';

interface MessageBubbleProps {
  message: ChatMessage;
  onToggleThinking?: () => void;
}

export default function MessageBubble({ message, onToggleThinking }: MessageBubbleProps) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const hasContent = message.content.length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const showThinkingIndicator = !isUser && message.isStreaming && !hasContent && !hasToolCalls;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
    gap: theme.spacing.xs,
    maxWidth: '100%',
  };

  const bubbleStyle: CSSProperties = {
    maxWidth: 'min(80%, 600px)',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    backgroundColor: isUser ? theme.colors.text.primary : theme.colors.background.secondary,
    color: isUser ? theme.colors.background.primary : theme.colors.text.primary,
    fontSize: '0.9375rem',
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
    fontSize: '0.75rem',
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
      {hasToolCalls && (
        <ToolCallDisplay toolCalls={message.toolCalls!} />
      )}
      {hasContent && (
        <div style={bubbleStyle}>
          {message.isStreaming ? (
            <StreamingText text={message.content} />
          ) : (
            message.content
          )}
        </div>
      )}
      {message.thinking && (
        <ThinkingIndicator
          thinking={message.thinking}
          onToggle={onToggleThinking}
        />
      )}
      {hasContent && <span style={timeStyle}>{formatTime(message.timestamp)}</span>}
    </div>
  );
}
