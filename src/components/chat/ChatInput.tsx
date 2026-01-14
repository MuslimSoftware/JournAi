import { useState, useRef, KeyboardEvent } from 'react';
import { IoSend } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { IconButton, TextArea } from '../themed';
import { CHAT } from './constants';
import type { ChatMessage } from '../../types/chat';
import '../../styles/chat.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  messages?: ChatMessage[];
}

export default function ChatInput({ onSend, disabled, placeholder = "Message...", messages = [] }: ChatInputProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value);
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, CHAT.input.maxHeight)}px`;
    }
  };

  const handleCopyConversation = async () => {
    if (messages.length === 0) return;

    const conversationText = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => {
        const role = msg.role === 'user' ? 'You' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    await navigator.clipboard.writeText(conversationText);
  };

  return (
    <div className="chat-input">
      <div className="chat-input-row">
        <div
          className="chat-input-wrapper"
          style={{
            '--chat-border-hover': theme.colors.text.muted,
            '--chat-border-focus': theme.colors.text.secondary,
          } as React.CSSProperties}
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
            style={{ maxHeight: `${CHAT.input.maxHeight}px`, fontFamily: theme.typography.fontFamily }}
          />
        </div>
        <IconButton
          icon={<IoSend size={CHAT.iconSize.lg} />}
          label="Send message"
          variant={value.trim() ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={{ borderRadius: '50%' }}
        />
      </div>
      <div className="chat-toolbar">
        <button
          className="chat-toolbar-button"
          style={{
            fontFamily: theme.typography.fontFamily,
            '--toolbar-hover-bg': theme.colors.background.secondary,
            '--toolbar-hover-color': theme.colors.text.secondary,
          } as React.CSSProperties}
          onClick={handleCopyConversation}
          disabled={messages.length === 0}
        >
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}
