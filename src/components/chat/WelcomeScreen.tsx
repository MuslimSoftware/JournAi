import { IoChatbubbleEllipses, IoSparkles, IoTrendingUp, IoCalendar } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../themed';
import { CHAT } from './constants';
import '../../styles/chat.css';

interface WelcomeScreenProps {
  onSuggestionClick?: (suggestion: string) => void;
}

const SUGGESTIONS = [
  { icon: IoSparkles, text: "What emotions have I been feeling?" },
  { icon: IoTrendingUp, text: "How has my mood been lately?" },
  { icon: IoCalendar, text: "Summarize my week" },
  { icon: IoChatbubbleEllipses, text: "Who have I mentioned most?" },
];

export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const { theme } = useTheme();

  return (
    <div className="chat-welcome">
      <div>
        <Text as="h2" variant="primary" className="chat-welcome-title">
          Chat with your Journal
        </Text>
        <Text as="p" variant="muted">
          Ask questions about your entries, emotions, or relationships
        </Text>
      </div>
      <div className="chat-suggestions-grid">
        {SUGGESTIONS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="chat-suggestion"
            style={{ '--chat-border-focus': theme.colors.text.secondary } as React.CSSProperties}
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
