import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface StreamingTextProps {
  text: string;
}

export default function StreamingText({ text }: StreamingTextProps) {
  const { theme } = useTheme();

  const cursorStyle: CSSProperties = {
    display: 'inline-block',
    width: '2px',
    height: '1em',
    backgroundColor: theme.colors.text.primary,
    marginLeft: '2px',
    animation: 'blink 1s step-end infinite',
    verticalAlign: 'text-bottom',
  };

  return (
    <span>
      {text}
      <span style={cursorStyle} />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}
