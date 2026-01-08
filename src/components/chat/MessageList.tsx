import { CSSProperties, forwardRef, UIEvent } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatMessage } from '../../types/chat';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onToggleThinking: (messageId: string) => void;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages, onToggleThinking, onScroll, onSuggestionClick }, ref) => {
    const { theme } = useTheme();

    const containerStyle: CSSProperties = {
      flex: 1,
      overflow: 'auto',
      padding: theme.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.md,
    };

    if (messages.length === 0) {
      return (
        <div ref={ref} style={containerStyle}>
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        </div>
      );
    }

    return (
      <div ref={ref} style={containerStyle} onScroll={onScroll}>
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
