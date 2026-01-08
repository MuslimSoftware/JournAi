import { CSSProperties, useState, useRef, KeyboardEvent } from 'react';
import { IoSend } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { IconButton } from '../themed';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder = "Message..." }: ChatInputProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  };

  const getBorderColor = () => {
    if (isFocused) return theme.colors.text.secondary;
    if (isHovered) return theme.colors.text.muted;
    return theme.colors.border.primary;
  };

  const inputWrapperStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: '24px',
    border: `1px solid ${getBorderColor()}`,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    transition: 'border-color 0.15s ease-out',
  };

  const textareaStyle: CSSProperties = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    color: theme.colors.text.primary,
    fontSize: '16px',
    fontFamily: theme.typography.fontFamily,
    resize: 'none',
    outline: 'none',
    maxHeight: '150px',
    lineHeight: '1.5',
  };

  return (
    <div style={containerStyle}>
      <div
        style={inputWrapperStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={1}
          style={textareaStyle}
        />
      </div>
      <IconButton
        icon={<IoSend size={18} />}
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
