import { CSSProperties } from 'react';
import { IoChatbubbleEllipses, IoSparkles, IoTrendingUp, IoCalendar } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../themed';
import { CHAT } from './constants';

interface WelcomeScreenProps {
  onSuggestionClick?: (suggestion: string) => void;
}

const SUGGESTIONS = [
  { icon: IoSparkles, text: "What patterns do you see in my journal?" },
  { icon: IoTrendingUp, text: "How has my mood been lately?" },
  { icon: IoCalendar, text: "Summarize my week" },
  { icon: IoChatbubbleEllipses, text: "What should I reflect on today?" },
];

export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    padding: theme.spacing.xl,
    textAlign: 'center',
  };

  const suggestionsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: '600px',
  };

  const suggestionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.primary}`,
    borderRadius: CHAT.expandable.borderRadius,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: CHAT.fontSize.small,
    color: theme.colors.text.secondary,
    '--chat-border-focus': theme.colors.text.secondary,
  } as CSSProperties;

  return (
    <div style={containerStyle}>
      <div>
        <Text as="h2" variant="primary" style={{ marginBottom: theme.spacing.sm }}>
          Chat with your Journal
        </Text>
        <Text as="p" variant="muted">
          Ask questions about your entries, discover patterns, or get insights
        </Text>
      </div>
      <div style={suggestionsStyle}>
        {SUGGESTIONS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="chat-suggestion"
            style={suggestionStyle}
            onClick={() => onSuggestionClick?.(text)}
          >
            <Icon size={CHAT.iconSize.lg} color={theme.colors.text.secondary} />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
