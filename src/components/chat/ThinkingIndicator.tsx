import { IoSparkles } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { ThinkingBlock } from '../../types/chat';
import ExpandableSection from './ExpandableSection';
import { CHAT } from './constants';

interface ThinkingIndicatorProps {
  thinking: ThinkingBlock;
  onToggle?: () => void;
}

export default function ThinkingIndicator({ thinking, onToggle }: ThinkingIndicatorProps) {
  const { theme } = useTheme();

  return (
    <div style={{ maxWidth: CHAT.bubble.maxWidth }}>
      <ExpandableSection
        icon={<IoSparkles size={CHAT.iconSize.md} color={theme.colors.text.secondary} />}
        title="Thinking"
        isExpanded={thinking.isExpanded}
        onToggle={onToggle ?? (() => {})}
      >
        {thinking.content}
      </ExpandableSection>
    </div>
  );
}
