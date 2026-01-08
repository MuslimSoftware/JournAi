import { CSSProperties, useState } from 'react';
import { IoConstruct, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { ToolCall } from '../../types/chat';
import ExpandableSection from './ExpandableSection';
import { CHAT } from './constants';

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

export default function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  const { theme } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    maxWidth: CHAT.bubble.maxWidth,
  };

  const detailsStyle: CSSProperties = {
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  };

  const getStatusIcon = (status: ToolCall['status']) => {
    const size = CHAT.iconSize.sm;
    switch (status) {
      case 'completed':
        return <IoCheckmarkCircle color={theme.colors.status.success} size={size} />;
      case 'error':
        return <IoAlertCircle color={theme.colors.status.error} size={size} />;
      default:
        return <IoConstruct color={theme.colors.text.secondary} size={size} />;
    }
  };

  return (
    <div style={containerStyle}>
      {toolCalls.map(tool => (
        <ExpandableSection
          key={tool.id}
          icon={getStatusIcon(tool.status)}
          title={tool.name}
          isExpanded={expandedIds.has(tool.id)}
          onToggle={() => toggleExpand(tool.id)}
          borderRadius={CHAT.toolCall.borderRadius}
        >
          <div style={detailsStyle}>
            <div>Args: {tool.arguments}</div>
            {tool.result && <div>Result: {tool.result}</div>}
          </div>
        </ExpandableSection>
      ))}
    </div>
  );
}
