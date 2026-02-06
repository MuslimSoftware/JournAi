import {
  CSSProperties,
  useCallback,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import { useChat } from "../../hooks/useChat";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import type { Chat } from "../../types/chatHistory";
import type { OpenAIModel } from "../../types/chat";
import { appStore, STORE_KEYS } from "../../lib/store";
import "../../styles/chat.css";

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
  const [hasInitialScrollApplied, setHasInitialScrollApplied] = useState(false);
  const [model, setModel] = useState<OpenAIModel>("gpt-5.2");
  const {
    messages,
    isLoading,
    isThinking,
    sendMessage,
    toggleThinkingExpanded,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    lastTokenUsage,
  } = useChat({
    chatId,
    onTitleGenerated,
    onMessageAdded,
  });
  const isAnyMessageStreaming = messages.some((msg) => msg.isStreaming);
  const lastMessageContent =
    messages.length > 0 ? messages[messages.length - 1].content : "";
  const { scrollRef, scrollToBottom } = useAutoScroll({
    behavior: "auto",
    deps: hasInitialScrollApplied
      ? [messages.length, isAnyMessageStreaming, lastMessageContent]
      : [],
  });
  const prevMessageCountRef = useRef(0);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    const loadModel = async () => {
      const savedModel = await appStore.get<OpenAIModel>(STORE_KEYS.AI_MODEL);
      if (savedModel) setModel(savedModel);
    };
    loadModel();
  }, []);

  useEffect(() => {
    setHasInitialScrollApplied(false);
  }, [chatId]);

  // Preserve scroll position when loading more messages
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // If messages were prepended (count increased but we were loading more)
    if (
      messages.length > prevMessageCountRef.current &&
      prevScrollHeightRef.current > 0
    ) {
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

  useLayoutEffect(() => {
    if (!chatId || messages.length === 0 || hasInitialScrollApplied) {
      return;
    }

    scrollToBottom(true);
    setHasInitialScrollApplied(true);
  }, [chatId, messages.length, hasInitialScrollApplied, scrollToBottom]);

  useEffect(() => {
    if (chatId && pendingMessage) {
      sendMessage(pendingMessage);
      setPendingMessage(null);
    }
  }, [chatId, pendingMessage, sendMessage]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!chatId && onCreateChat) {
        setPendingMessage(content);
        await onCreateChat();
      } else {
        sendMessage(content);
      }
    },
    [chatId, onCreateChat, sendMessage],
  );

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
          tokenUsage={lastTokenUsage}
          model={model}
        />
      </div>
    </div>
  );
}
