export const CHAT = {
  maxWidth: '680px',
  bubble: {
    maxWidth: 'min(80%, 600px)',
    userRadius: '18px 18px 4px 18px',
    assistantRadius: '18px 18px 18px 4px',
  },
  input: {
    borderRadius: '24px',
    maxHeight: 150,
  },
  expandable: {
    borderRadius: '12px',
  },
  toolCall: {
    borderRadius: '8px',
  },
  fontSize: {
    message: '0.9375rem',
    small: '0.875rem',
    xsmall: '0.8125rem',
    xxsmall: '0.75rem',
  },
  transition: {
    default: '0.15s ease-out',
    layout: '0.25s ease-out',
  },
  iconSize: {
    sm: 14,
    md: 16,
    lg: 18,
  },
} as const;
