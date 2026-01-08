import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../hooks/useChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface ChatContainerProps {
  style?: CSSProperties;
  inputWrapperStyle?: CSSProperties;
}

export default function ChatContainer({ style, inputWrapperStyle }: ChatContainerProps) {
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

  return (
    <div style={containerStyle} className="chat-container">
      <MessageList
        ref={scrollRef}
        messages={messages}
        isThinking={isThinking}
        onToggleThinking={toggleThinkingExpanded}
        onSuggestionClick={sendMessage}
      />
      <div style={inputWrapperStyle}>
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          placeholder="Ask about your journal..."
        />
      </div>
    </div>
  );
}
