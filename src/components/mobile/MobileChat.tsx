import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useChat } from '../../hooks/useChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import MessageList from '../chat/MessageList';
import ChatInput from '../chat/ChatInput';

export default function MobileChat() {
  const { theme } = useTheme();
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const { messages, isLoading, isThinking, sendMessage, toggleThinkingExpanded } = useChat();
  const { scrollRef } = useAutoScroll();

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: theme.colors.background.primary,
  };

  const inputWrapperStyle: CSSProperties = {
    paddingBottom: isKeyboardOpen
      ? '0'
      : 'calc(var(--mobile-safe-area-bottom))',
    transition: 'padding-bottom 0.25s ease-out',
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div style={containerStyle}>
      <MessageList
        ref={scrollRef}
        messages={messages}
        isThinking={isThinking}
        onToggleThinking={toggleThinkingExpanded}
        onSuggestionClick={handleSuggestionClick}
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
