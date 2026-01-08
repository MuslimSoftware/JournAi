import { CSSProperties, useState } from 'react';
import { IoConstruct, IoCheckmarkCircle, IoAlertCircle, IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { ToolCall } from '../../types/chat';

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
    maxWidth: 'min(80%, 600px)',
  };

  const toolStyle: CSSProperties = {
    borderRadius: '8px',
    backgroundColor: theme.colors.background.tertiary,
    border: `1px solid ${theme.colors.border.secondary}`,
    overflow: 'hidden',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    cursor: 'pointer',
    fontSize: '0.8125rem',
  };

  const detailsStyle: CSSProperties = {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.muted,
    borderTop: `1px solid ${theme.colors.border.secondary}`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  };

  const getStatusIcon = (status: ToolCall['status']) => {
    switch (status) {
      case 'completed': return <IoCheckmarkCircle color="#22c55e" size={14} />;
      case 'error': return <IoAlertCircle color="#ef4444" size={14} />;
      default: return <IoConstruct color={theme.colors.text.secondary} size={14} />;
    }
  };

  return (
    <div style={containerStyle}>
      {toolCalls.map(tool => (
        <div key={tool.id} style={toolStyle}>
          <div style={headerStyle} onClick={() => toggleExpand(tool.id)}>
            {getStatusIcon(tool.status)}
            <span style={{ flex: 1, color: theme.colors.text.secondary }}>{tool.name}</span>
            {expandedIds.has(tool.id) ? <IoChevronDown size={14} /> : <IoChevronForward size={14} />}
          </div>
          {expandedIds.has(tool.id) && (
            <div style={detailsStyle}>
              <div>Args: {tool.arguments}</div>
              {tool.result && <div>Result: {tool.result}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
