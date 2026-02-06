import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  ChatState,
  MessageRole,
  OpenAIModel,
  ToolCall,
} from "../types/chat";
import {
  sendAgentChatMessage,
  formatMessagesForAPI,
  shouldCompact,
  compactConversation,
  type TokenUsage,
} from "../services/ai";
import * as chatMessagesService from "../services/chatMessages";
import * as chatsService from "../services/chats";
import { appStore, STORE_KEYS } from "../lib/store";
import { getApiKey } from "../lib/secureStorage";

interface UseChatOptions {
  chatId: string | null;
  onTitleGenerated?: (chatId: string, title: string) => void;
  onMessageAdded?: (chatId: string) => void;
}

interface UseChatReturn extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  toggleThinkingExpanded: (messageId: string) => void;
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isCompacting: boolean;
  lastTokenUsage: TokenUsage | null;
}

const MESSAGES_PAGE_SIZE = 50;

interface ChatMessagesCacheEntry {
  messages: ChatMessage[];
  hasMoreMessages: boolean;
  totalMessageCount: number;
}

const chatMessagesSessionCache = new Map<string, ChatMessagesCacheEntry>();

export function useChat({
  chatId,
  onTitleGenerated,
  onMessageAdded,
}: UseChatOptions): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isThinking: false,
    error: null,
  });

  const [aiSettings, setAiSettings] = useState<{
    apiKey: string;
    model: OpenAIModel;
  } | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [isCompacting, setIsCompacting] = useState(false);
  const [lastTokenUsage, setLastTokenUsage] = useState<TokenUsage | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const titleGeneratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadSettings = async () => {
      const apiKey = getApiKey();
      const model = await appStore.get<OpenAIModel>(STORE_KEYS.AI_MODEL);
      if (apiKey) {
        setAiSettings({ apiKey, model: model || "gpt-5.2" });
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!chatId) {
      setState({
        messages: [],
        isLoading: false,
        isThinking: false,
        error: null,
      });
      setHasMoreMessages(false);
      setTotalMessageCount(0);
      return;
    }

    const cachedMessages = chatMessagesSessionCache.get(chatId);
    if (cachedMessages) {
      setState({
        messages: cachedMessages.messages,
        isLoading: false,
        isThinking: false,
        error: null,
      });
      setHasMoreMessages(cachedMessages.hasMoreMessages);
      setTotalMessageCount(cachedMessages.totalMessageCount);
    } else {
      setState({
        messages: [],
        isLoading: false,
        isThinking: false,
        error: null,
      });
      setHasMoreMessages(false);
      setTotalMessageCount(0);
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        // Get total count
        const count = await chatMessagesService.getMessageCount(chatId);
        if (cancelled) return;
        setTotalMessageCount(count);

        // Load most recent messages
        const messages = await chatMessagesService.getMessages(
          chatId,
          MESSAGES_PAGE_SIZE,
        );
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          messages,
        }));

        // Check if there are more messages to load
        const hasMore = count > MESSAGES_PAGE_SIZE;
        setHasMoreMessages(hasMore);
        chatMessagesSessionCache.set(chatId, {
          messages,
          hasMoreMessages: hasMore,
          totalMessageCount: count,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load messages:", error);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    chatMessagesSessionCache.set(chatId, {
      messages: state.messages,
      hasMoreMessages,
      totalMessageCount,
    });
  }, [chatId, state.messages, hasMoreMessages, totalMessageCount]);

  const loadMoreMessages = useCallback(async () => {
    if (!chatId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const currentCount = state.messages.length;
      const olderMessages = await chatMessagesService.getMessages(
        chatId,
        MESSAGES_PAGE_SIZE,
        currentCount,
      );

      setState((prev) => ({
        ...prev,
        messages: [...olderMessages, ...prev.messages],
      }));

      // Update hasMore based on total count
      setHasMoreMessages(
        currentCount + olderMessages.length < totalMessageCount,
      );
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    chatId,
    isLoadingMore,
    hasMoreMessages,
    state.messages.length,
    totalMessageCount,
  ]);

  const generateTitleIfNeeded = useCallback(
    async (currentChatId: string, messages: ChatMessage[]) => {
      if (!aiSettings?.apiKey || titleGeneratedRef.current.has(currentChatId))
        return;

      const userMessages = messages.filter((m) => m.role === "user");
      const assistantMessages = messages.filter(
        (m) => m.role === "assistant" && m.content && !m.isStreaming,
      );

      if (userMessages.length >= 1 && assistantMessages.length >= 1) {
        titleGeneratedRef.current.add(currentChatId);
        try {
          const conversationForTitle = messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }));

          const title = await chatsService.generateChatTitle(
            conversationForTitle,
            aiSettings.apiKey,
            aiSettings.model,
          );

          await chatsService.updateChat(currentChatId, { title });
          onTitleGenerated?.(currentChatId, title);
        } catch (error) {
          console.error("Failed to generate title:", error);
        }
      }
    },
    [aiSettings, onTitleGenerated],
  );

  const addMessage = useCallback((message: ChatMessage) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<ChatMessage>) => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg,
        ),
      }));
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !chatId) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user" as MessageRole,
        content: content.trim(),
        timestamp: new Date(),
        status: "sent",
      };

      addMessage(userMessage);

      await chatMessagesService.addMessage(chatId, {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        status: userMessage.status,
      });

      await chatsService.touchChat(chatId);
      onMessageAdded?.(chatId);

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isThinking: true,
        error: null,
      }));

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as MessageRole,
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      addMessage(assistantMessage);

      if (!aiSettings?.apiKey) {
        setState((prev) => ({ ...prev, isThinking: false }));
        const errorContent =
          "Please configure your OpenAI API key in Settings > AI to use the chat feature.";
        updateMessage(assistantMessage.id, {
          content: errorContent,
          isStreaming: false,
          status: "sent",
        });
        await chatMessagesService.addMessage(chatId, {
          id: assistantMessage.id,
          role: "assistant",
          content: errorContent,
          status: "sent",
        });
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, isThinking: false }));

        const conversationHistory = state.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        conversationHistory.push({ role: "user", content: content.trim() });

        const apiMessages = formatMessagesForAPI(conversationHistory);
        let accumulatedContent = "";
        let capturedRagContext: typeof assistantMessage.ragContext = undefined;
        let toolCallsState: ToolCall[] = [];

        await sendAgentChatMessage(
          content.trim(),
          apiMessages.slice(0, -1),
          aiSettings.apiKey,
          aiSettings.model,
          {
            onToolCallStart: (toolCall) => {
              toolCallsState = [...toolCallsState, toolCall];
              updateMessage(assistantMessage.id, {
                toolCalls: [...toolCallsState],
              });
            },
            onToolCallComplete: (toolCall) => {
              toolCallsState = toolCallsState.map((tc) =>
                tc.id === toolCall.id ? toolCall : tc,
              );
              updateMessage(assistantMessage.id, {
                toolCalls: [...toolCallsState],
              });
            },
            onContext: (context) => {
              capturedRagContext = context;
              updateMessage(assistantMessage.id, {
                citations: context.citations,
                ragContext: context,
              });
            },
            onToken: (token) => {
              accumulatedContent += token;
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: msg.content + token }
                    : msg,
                ),
              }));
            },
            onUsage: (usage) => {
              setLastTokenUsage(usage);
            },
            onComplete: async () => {
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === assistantMessage.id
                    ? { ...msg, isStreaming: false, status: "sent" }
                    : msg,
                ),
                isLoading: false,
              }));

              await chatMessagesService.addMessage(chatId, {
                id: assistantMessage.id,
                role: "assistant",
                content: accumulatedContent,
                status: "sent",
                citations: capturedRagContext?.citations,
                ragContext: capturedRagContext,
                toolCalls:
                  toolCallsState.length > 0 ? toolCallsState : undefined,
              });

              const updatedMessages = [
                ...state.messages,
                userMessage,
                {
                  ...assistantMessage,
                  content: accumulatedContent,
                  isStreaming: false,
                },
              ];
              generateTitleIfNeeded(chatId, updatedMessages);

              if (
                lastTokenUsage &&
                shouldCompact(lastTokenUsage.promptTokens, aiSettings.model)
              ) {
                setIsCompacting(true);
                try {
                  const messagesToCompact = updatedMessages
                    .filter((m) => m.role === "user" || m.role === "assistant")
                    .slice(0, -3)
                    .map((m) => ({
                      role: m.role as "user" | "assistant",
                      content: m.content,
                    }));

                  if (messagesToCompact.length > 2) {
                    const { summary } = await compactConversation(
                      messagesToCompact,
                      aiSettings.apiKey,
                      aiSettings.model,
                    );

                    const recentMessages = updatedMessages.slice(-3);
                    const compactedMessage: ChatMessage = {
                      id: `msg-compacted-${Date.now()}`,
                      role: "assistant" as MessageRole,
                      content: `[Conversation Summary]\n${summary}`,
                      timestamp: new Date(),
                      status: "sent",
                    };

                    setState((prev) => ({
                      ...prev,
                      messages: [compactedMessage, ...recentMessages],
                    }));

                    console.log(
                      `Context compacted: ${lastTokenUsage.promptTokens} tokens exceeded threshold`,
                    );
                  }
                } catch (compactError) {
                  console.error(
                    "Failed to compact conversation:",
                    compactError,
                  );
                } finally {
                  setIsCompacting(false);
                }
              }
            },
            onError: async (error) => {
              const errorContent = `Error: ${error.message}`;
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === assistantMessage.id
                    ? {
                        ...msg,
                        content: errorContent,
                        isStreaming: false,
                        status: "error",
                      }
                    : msg,
                ),
                isLoading: false,
                error: error.message,
              }));

              await chatMessagesService.addMessage(chatId, {
                id: assistantMessage.id,
                role: "assistant",
                content: errorContent,
                status: "error",
              });
            },
          },
          abortControllerRef.current.signal,
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again.";
        const errorContent = `Error: ${errorMessage}`;

        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: errorContent,
                  isStreaming: false,
                  status: "error",
                }
              : msg,
          ),
          isLoading: false,
          isThinking: false,
          error: errorMessage,
        }));

        await chatMessagesService.addMessage(chatId, {
          id: assistantMessage.id,
          role: "assistant",
          content: errorContent,
          status: "error",
        });
      }
    },
    [
      addMessage,
      updateMessage,
      state.messages,
      aiSettings,
      chatId,
      onMessageAdded,
      generateTitleIfNeeded,
      lastTokenUsage,
    ],
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = state.messages.find((m) => m.id === messageId);
      if (!message || message.role !== "user") return;

      const index = state.messages.findIndex((m) => m.id === messageId);
      setState((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, index),
        error: null,
      }));

      await sendMessage(message.content);
    },
    [state.messages, sendMessage],
  );

  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      messages: [],
      isLoading: false,
      isThinking: false,
      error: null,
    });
  }, []);

  const toggleThinkingExpanded = useCallback((messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === messageId && msg.thinking
          ? {
              ...msg,
              thinking: {
                ...msg.thinking,
                isExpanded: !msg.thinking.isExpanded,
              },
            }
          : msg,
      ),
    }));
  }, []);

  return {
    ...state,
    sendMessage,
    retryMessage,
    clearMessages,
    toggleThinkingExpanded,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    isCompacting,
    lastTokenUsage,
  };
}
