import { CSSProperties, useState } from 'react';
import { IoConstruct, IoCheckmarkCircle, IoAlertCircle, IoSync } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { ToolCall } from '../../types/chat';
import ExpandableSection from './ExpandableSection';
import { CHAT } from './constants';
import { getToolDescription } from '../../services/agentTools';

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

  const spinnerStyle: CSSProperties = {
    animation: 'spin 1s linear infinite',
  };

  const getStatusIcon = (status: ToolCall['status']) => {
    const size = CHAT.iconSize.sm;
    switch (status) {
      case 'completed':
        return <IoCheckmarkCircle color={theme.colors.status.success} size={size} />;
      case 'error':
        return <IoAlertCircle color={theme.colors.status.error} size={size} />;
      case 'running':
        return <IoSync color={theme.colors.text.secondary} size={size} style={spinnerStyle} />;
      default:
        return <IoConstruct color={theme.colors.text.secondary} size={size} />;
    }
  };

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={containerStyle}>
        {toolCalls.map(tool => (
          <ExpandableSection
            key={tool.id}
            icon={getStatusIcon(tool.status)}
            title={getToolDescription(tool.name, tool.arguments)}
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
    </>
  );
}
