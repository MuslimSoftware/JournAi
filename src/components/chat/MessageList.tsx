import { CSSProperties, forwardRef, UIEvent, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatMessage } from '../../types/chat';
import { Spinner } from '../themed';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onToggleThinking: (messageId: string) => void;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages, onToggleThinking, onScroll, onSuggestionClick, onLoadMore, hasMore, isLoadingMore }, ref) => {
    const { theme } = useTheme();
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Auto-load more messages when sentinel comes into view
    useEffect(() => {
      if (!sentinelRef.current || !hasMore || isLoadingMore || !onLoadMore) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            onLoadMore();
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(sentinelRef.current);

      return () => {
        observer.disconnect();
      };
    }, [hasMore, isLoadingMore, onLoadMore]);

    const containerStyle: CSSProperties = {
      padding: theme.spacing.md,
      paddingTop: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.md,
    };

    if (messages.length === 0) {
      return (
        <div ref={ref} style={containerStyle} className="chat-message-list">
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        </div>
      );
    }

    return (
      <div ref={ref} style={containerStyle} className="chat-message-list" onScroll={onScroll}>
        {hasMore && (
          <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing.md, minHeight: '40px' }}>
            {isLoadingMore && <Spinner size="sm" />}
          </div>
        )}
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onToggleThinking={() => onToggleThinking(message.id)}
          />
        ))}
      </div>
    );
  }
);

MessageList.displayName = 'MessageList';

export default MessageList;
