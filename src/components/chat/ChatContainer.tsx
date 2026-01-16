import { CSSProperties, useCallback, useState, useEffect, useRef } from 'react';
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
  const {
    messages,
    isLoading,
    isThinking,
    sendMessage,
    toggleThinkingExpanded,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  } = useChat({
    chatId,
    onTitleGenerated,
    onMessageAdded,
  });
  const isAnyMessageStreaming = messages.some(msg => msg.isStreaming);
  const lastMessageContent = messages.length > 0 ? messages[messages.length - 1].content : '';
  const { scrollRef, scrollToBottom } = useAutoScroll({
    deps: [messages.length, isAnyMessageStreaming, lastMessageContent]
  });
  const prevMessageCountRef = useRef(0);
  const prevScrollHeightRef = useRef(0);

  // Preserve scroll position when loading more messages
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // If messages were prepended (count increased but we were loading more)
    if (messages.length > prevMessageCountRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = scrollElement.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;

      // Adjust scroll position to maintain visual position
      if (heightDiff > 0) {
        scrollElement.scrollTop += heightDiff;
      }
    }

    prevMessageCountRef.current = messages.length;
    prevScrollHeightRef.current = scrollElement.scrollHeight;
  }, [messages.length, scrollRef]);

  // Scroll to bottom when opening a chat with existing messages
  useEffect(() => {
    if (chatId && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom(true); // immediate scroll, no smooth behavior
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]); // Only trigger when chatId changes, not when messages update

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
        onLoadMore={loadMoreMessages}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMore}
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
