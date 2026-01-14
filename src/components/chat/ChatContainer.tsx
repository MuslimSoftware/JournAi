import { CSSProperties, useCallback, useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { Chat } from '../../types/chatHistory';
import '../../styles/chat.css';

interface ChatContainerProps {
  chatId: string | null;
  onTitleGenerated?: (chatId: string, title: string) => void;
  onMessageAdded?: (chatId: string) => void;
  onCreateChat?: () => Promise<Chat>;
  style?: CSSProperties;
  inputWrapperStyle?: CSSProperties;
}

export default function ChatContainer({
  chatId,
  onTitleGenerated,
  onMessageAdded,
  onCreateChat,
  style,
  inputWrapperStyle,
}: ChatContainerProps) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const { messages, isLoading, isThinking, sendMessage, toggleThinkingExpanded } = useChat({
    chatId,
    onTitleGenerated,
    onMessageAdded,
  });
  const { scrollRef } = useAutoScroll({ deps: [messages.length] });

  useEffect(() => {
    if (chatId && pendingMessage) {
      sendMessage(pendingMessage);
      setPendingMessage(null);
    }
  }, [chatId, pendingMessage, sendMessage]);

  const handleSend = useCallback(async (content: string) => {
    if (!chatId && onCreateChat) {
      setPendingMessage(content);
      await onCreateChat();
    } else {
      sendMessage(content);
    }
  }, [chatId, onCreateChat, sendMessage]);

  return (
    <div style={style} className="chat-container">
      <MessageList
        ref={scrollRef}
        messages={messages}
        isThinking={isThinking}
        onToggleThinking={toggleThinkingExpanded}
        onSuggestionClick={handleSend}
      />
      <div style={inputWrapperStyle}>
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder="Ask about your journal..."
          messages={messages}
        />
      </div>
    </div>
  );
}
