import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../hooks/useChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface ChatContainerProps {
  style?: CSSProperties;
}

export default function ChatContainer({ style }: ChatContainerProps) {
  const { theme } = useTheme();
  const { messages, isLoading, isThinking, sendMessage, toggleThinkingExpanded } = useChat();
  const { scrollRef } = useAutoScroll();

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    ...style,
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div style={containerStyle} className="chat-container">
      <MessageList
        ref={scrollRef}
        messages={messages}
        isThinking={isThinking}
        onToggleThinking={toggleThinkingExpanded}
        onSuggestionClick={handleSuggestionClick}
      />
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder="Ask about your journal..."
      />
    </div>
  );
}
