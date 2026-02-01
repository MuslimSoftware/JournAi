import { useState, useRef, KeyboardEvent } from "react";
import { IoSend, IoCopy, IoCheckmark } from "react-icons/io5";
import { useTheme } from "../../contexts/ThemeContext";
import { IconButton, TextArea } from "../themed";
import { CHAT } from "./constants";
import type { ChatMessage, OpenAIModel } from "../../types/chat";
import type { TokenUsage } from "../../services/ai";
import { getModelContextLimit } from "../../services/ai";
import "../../styles/chat.css";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  messages?: ChatMessage[];
  tokenUsage?: TokenUsage | null;
  model?: OpenAIModel;
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Message...",
  messages = [],
  tokenUsage,
  model,
}: ChatInputProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, CHAT.input.maxHeight)}px`;
    }
  };

  const handleCopyConversation = async () => {
    if (messages.length === 0) return;

    const conversationText = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => {
        const role = msg.role === "user" ? "You" : "Assistant";
        let text = `${role}: ${msg.content}`;

        // Add sources if available
        if (msg.role === "assistant") {
          const hasInsights =
            msg.ragContext?.insights && msg.ragContext.insights.length > 0;
          const hasCitations = msg.citations && msg.citations.length > 0;

          if (hasInsights || hasCitations) {
            text += "\n\nSources:";

            if (hasInsights) {
              text += "\n\nInsights:";
              msg.ragContext!.insights!.forEach((insight) => {
                if (insight.type === "person") {
                  const rel = insight.relationship
                    ? ` (${insight.relationship})`
                    : "";
                  const ctx = insight.context ? ` - ${insight.context}` : "";
                  text += `\n  • ${insight.name}${rel} [${insight.sentiment}] on ${insight.entryDate}${ctx}`;
                } else {
                  const trigger = insight.trigger
                    ? ` - ${insight.trigger}`
                    : "";
                  text += `\n  • ${insight.emotion} (intensity: ${insight.intensity}/10) [${insight.sentiment}] on ${insight.entryDate}${trigger}`;
                }
              });
            }

            if (hasCitations) {
              text += "\n\nJournal Entries:";
              msg.citations!.forEach((citation) => {
                text += `\n  • Entry from ${citation.entryId}`;
              });
            }
          }

          // Add context if available
          if (msg.ragContext?.contextText) {
            text += "\n\nContext:\n" + msg.ragContext.contextText;
          }
        }

        return text;
      })
      .join("\n\n");

    await navigator.clipboard.writeText(conversationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="chat-input">
      <div className="chat-toolbar">
        <button
          className="chat-toolbar-button"
          style={
            {
              fontFamily: theme.typography.fontFamily,
              "--toolbar-hover-bg": theme.colors.background.secondary,
              "--toolbar-hover-color": theme.colors.text.secondary,
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.xs,
              transition: "all 0.25s ease-out",
            } as React.CSSProperties
          }
          onClick={handleCopyConversation}
          disabled={messages.length === 0}
        >
          {copied ? <IoCheckmark size={14} /> : <IoCopy size={14} />}
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
        {tokenUsage && model && (
          <ContextBar tokenUsage={tokenUsage} model={model} />
        )}
      </div>
      <div className="chat-input-row">
        <div
          className="chat-input-wrapper"
          style={
            {
              "--chat-border-hover": theme.colors.text.muted,
              "--chat-border-focus": theme.colors.text.secondary,
            } as React.CSSProperties
          }
          onClick={() => textareaRef.current?.focus()}
        >
          <TextArea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            rows={1}
            className="chat-textarea"
            style={{
              maxHeight: `${CHAT.input.maxHeight}px`,
              fontFamily: theme.typography.fontFamily,
            }}
          />
        </div>
        <IconButton
          icon={<IoSend size={CHAT.iconSize.lg} />}
          label="Send message"
          variant={value.trim() ? "primary" : "secondary"}
          size="sm"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={{ borderRadius: "50%" }}
        />
      </div>
    </div>
  );
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function ContextBar({
  tokenUsage,
  model,
}: {
  tokenUsage: TokenUsage;
  model: OpenAIModel;
}) {
  const { theme } = useTheme();
  const contextLimit = getModelContextLimit(model);
  const percentage = (tokenUsage.promptTokens / contextLimit) * 100;

  const getProgressClass = () => {
    if (percentage >= 75) return "chat-context-progress-fill--high";
    if (percentage >= 50) return "chat-context-progress-fill--medium";
    return "chat-context-progress-fill--low";
  };

  return (
    <div
      className="chat-context-bar"
      style={{ color: theme.colors.text.muted }}
    >
      <div
        className="chat-context-progress"
        style={{ background: theme.colors.background.secondary }}
      >
        <div
          className={`chat-context-progress-fill ${getProgressClass()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span style={{ fontFamily: theme.typography.fontFamily }}>
        {formatTokenCount(tokenUsage.promptTokens)} /{" "}
        {formatTokenCount(contextLimit)}
      </span>
    </div>
  );
}
