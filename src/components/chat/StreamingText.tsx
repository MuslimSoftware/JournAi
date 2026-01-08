import { useTheme } from '../../contexts/ThemeContext';

interface StreamingTextProps {
  text: string;
}

export default function StreamingText({ text }: StreamingTextProps) {
  const { theme } = useTheme();

  return (
    <span>
      {text}
      <span
        className="streaming-cursor"
        style={{ backgroundColor: theme.colors.text.primary }}
      />
    </span>
  );
}
