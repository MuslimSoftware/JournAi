import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ChatState, MessageRole, ToolCall } from '../types/chat';

interface UseChatReturn extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  toggleThinkingExpanded: (messageId: string) => void;
}

const STREAM_DELAY = 30;

export function useChat(): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isThinking: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  const simulateToolCall = async (messageId: string, toolName: string, args: string): Promise<string> => {
    const toolCall: ToolCall = {
      id: `tool-${Date.now()}`,
      name: toolName,
      arguments: args,
      status: 'pending',
    };

    updateMessage(messageId, {
      toolCalls: [toolCall],
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    toolCall.status = 'running';
    updateMessage(messageId, { toolCalls: [{ ...toolCall }] });

    await new Promise(resolve => setTimeout(resolve, 1000));
    toolCall.status = 'completed';
    toolCall.result = `Found 5 entries matching your criteria`;
    updateMessage(messageId, { toolCalls: [{ ...toolCall }] });

    return toolCall.result;
  };

  const simulateStreamingResponse = async (messageId: string, content: string): Promise<void> => {
    let streamedContent = '';

    for (let i = 0; i < content.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Aborted');
      }

      await new Promise(resolve => setTimeout(resolve, STREAM_DELAY));
      streamedContent += content[i];
      updateMessage(messageId, { content: streamedContent, isStreaming: true });
    }

    updateMessage(messageId, { isStreaming: false, status: 'sent' });
  };

  const generateMockResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    if (lower.includes('mood') || lower.includes('feel')) {
      return "Based on your recent entries, I notice you've been experiencing a mix of emotions. Your journal shows moments of excitement about work projects balanced with some stress about deadlines. Would you like me to analyze specific time periods?";
    }

    if (lower.includes('pattern') || lower.includes('trend')) {
      return "I've identified several patterns in your journaling habits:\n\n1. You tend to write more on weekdays, especially Monday and Wednesday\n2. Evening entries are typically longer and more reflective\n3. Recurring themes include work-life balance and personal growth\n\nWould you like me to dive deeper into any of these patterns?";
    }

    if (lower.includes('summary') || lower.includes('summarize')) {
      return "Here's a summary of your recent journal entries:\n\nThis week, you've documented your progress on the new project, reflected on team dynamics, and explored ideas for improving your morning routine. Key themes include productivity optimization and building better habits.";
    }

    return "I'm here to help you explore and understand your journal entries. I can analyze patterns, summarize periods, track your mood over time, or answer specific questions about your entries. What would you like to know?";
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as MessageRole,
      content: content.trim(),
      timestamp: new Date(),
      status: 'sent',
    };

    addMessage(userMessage);

    setState(prev => ({
      ...prev,
      isLoading: true,
      isThinking: true,
      error: null,
    }));

    try {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant' as MessageRole,
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      addMessage(assistantMessage);

      if (content.toLowerCase().includes('find') || content.toLowerCase().includes('search')) {
        await simulateToolCall(assistantMessage.id, 'searchEntries', JSON.stringify({
          query: content,
          limit: 5,
        }));
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setState(prev => ({ ...prev, isThinking: false }));

      const response = generateMockResponse(content);
      await simulateStreamingResponse(assistantMessage.id, response);

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Aborted') {
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isThinking: false,
        error: 'Failed to send message. Please try again.',
      }));
    }
  }, [addMessage, updateMessage]);

  const retryMessage = useCallback(async (messageId: string) => {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.role !== 'user') return;

    const index = state.messages.findIndex(m => m.id === messageId);
    setState(prev => ({
      ...prev,
      messages: prev.messages.slice(0, index + 1),
      error: null,
    }));

    await sendMessage(message.content);
  }, [state.messages, sendMessage]);

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
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId && msg.thinking
          ? { ...msg, thinking: { ...msg.thinking, isExpanded: !msg.thinking.isExpanded } }
          : msg
      ),
    }));
  }, []);

  return {
    ...state,
    sendMessage,
    retryMessage,
    clearMessages,
    toggleThinkingExpanded,
  };
}
