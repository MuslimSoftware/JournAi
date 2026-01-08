import { CSSProperties, useState, useRef, KeyboardEvent } from 'react';
import { IoSend } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { IconButton, TextArea } from '../themed';
import { CHAT } from './constants';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder = "Message..." }: ChatInputProps) {
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

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  };

  const inputWrapperStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: CHAT.input.borderRadius,
    border: `1px solid ${theme.colors.border.primary}`,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    cursor: 'text',
    '--chat-border-hover': theme.colors.text.muted,
    '--chat-border-focus': theme.colors.text.secondary,
  } as CSSProperties;

  const textareaStyle: CSSProperties = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    color: theme.colors.text.primary,
    fontSize: '16px',
    fontFamily: theme.typography.fontFamily,
    resize: 'none',
    outline: 'none',
    maxHeight: `${CHAT.input.maxHeight}px`,
    lineHeight: '1.5',
  };

  return (
    <div style={containerStyle}>
      <div
        className="chat-input-wrapper"
        style={inputWrapperStyle}
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
          style={textareaStyle}
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
  );
}
