import { IoCheckmarkCircle, IoAlertCircle, IoSync, IoSearch } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { ToolCall } from '../../types/chat';
import { CHAT } from './constants';
import { getToolDescription } from '../../services/agentTools';
import '../../styles/chat.css';

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

export default function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  const { theme } = useTheme();

  const getStatusIcon = (status: ToolCall['status']) => {
    const size = CHAT.iconSize.sm;
    switch (status) {
      case 'completed':
        return <IoCheckmarkCircle color={theme.colors.status.success} size={size} />;
      case 'error':
        return <IoAlertCircle color={theme.colors.status.error} size={size} />;
      case 'running':
        return <IoSync color={theme.colors.text.secondary} size={size} className="chat-tool-call-icon--spinning" />;
      default:
        return <IoSearch color={theme.colors.text.secondary} size={size} />;
    }
  };

  return (
    <div className="chat-tool-calls">
      {toolCalls.map(tool => (
        <div key={tool.id} className="chat-tool-call-item">
          {getStatusIcon(tool.status)}
          <span>{getToolDescription(tool.name, tool.arguments)}</span>
        </div>
      ))}
    </div>
  );
}
