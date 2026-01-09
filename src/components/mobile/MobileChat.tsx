import { CSSProperties, useCallback, useState } from 'react';
import { IoChevronDown, IoAddOutline } from 'react-icons/io5';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useChats } from '../../hooks/useChats';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatContainer } from '../chat';
import { Text } from '../themed';
import { CHAT } from '../chat/constants';
import BottomSheet from './BottomSheet';
import SwipeableListItem from './SwipeableListItem';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import type { Chat } from '../../types/chatHistory';

export default function MobileChat() {
  const { theme } = useTheme();
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const [showHistory, setShowHistory] = useState(false);
  const [isHeaderPressed, setIsHeaderPressed] = useState(false);

  const {
    chats,
    selectedChatId,
    selectedChat,
    createChat,
    updateChat,
    deleteChat,
    selectChat,
    refreshChats,
  } = useChats();

  const handleTitleGenerated = useCallback((chatId: string, title: string) => {
    updateChat(chatId, { title });
  }, [updateChat]);

  const handleMessageAdded = useCallback(async (_chatId: string) => {
    await refreshChats();
  }, [refreshChats]);

  const handleNewChat = useCallback(async () => {
    hapticImpact('light');
    await createChat();
    setShowHistory(false);
  }, [createChat]);

  const handleSelectChat = useCallback((id: string) => {
    hapticSelection();
    selectChat(id);
    setShowHistory(false);
  }, [selectChat]);

  const handleDeleteChat = useCallback(async (id: string) => {
    hapticImpact('medium');
    await deleteChat(id);
  }, [deleteChat]);

  const handleHeaderClick = useCallback(() => {
    if (!isKeyboardOpen) {
      hapticSelection();
      setShowHistory(true);
    }
  }, [isKeyboardOpen]);

  const inputWrapperStyle: CSSProperties = {
    paddingBottom: isKeyboardOpen ? '0' : 'calc(var(--mobile-safe-area-bottom))',
    transition: `padding-bottom ${CHAT.transition.layout}`,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.colors.border.primary}`,
    backgroundColor: isHeaderPressed ? theme.colors.background.secondary : theme.colors.background.primary,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    minHeight: '48px',
    transition: 'background-color 0.1s ease-out',
  };

  const currentTitle = selectedChat?.title || 'New Chat';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={headerStyle}
        onClick={handleHeaderClick}
        onTouchStart={() => !isKeyboardOpen && setIsHeaderPressed(true)}
        onTouchEnd={() => setIsHeaderPressed(false)}
        onTouchCancel={() => setIsHeaderPressed(false)}
      >
        <Text
          variant="primary"
          style={{
            fontWeight: 600,
            fontSize: '1rem',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentTitle}
        </Text>
        {!isKeyboardOpen && (
          <IoChevronDown
            size={16}
            color={theme.colors.text.muted}
            style={{
              transition: 'transform 0.2s ease',
              transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </header>

      <ChatContainer
        chatId={selectedChatId}
        onTitleGenerated={handleTitleGenerated}
        onMessageAdded={handleMessageAdded}
        onCreateChat={createChat}
        inputWrapperStyle={inputWrapperStyle}
        style={{ flex: 1 }}
      />

      <BottomSheet
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Conversations"
      >
        <ChatHistoryList
          chats={chats}
          selectedId={selectedChatId}
          onSelect={handleSelectChat}
          onDelete={handleDeleteChat}
          onNewChat={handleNewChat}
        />
      </BottomSheet>
    </div>
  );
}

interface ChatHistoryListProps {
  chats: Chat[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

function ChatHistoryList({
  chats,
  selectedId,
  onSelect,
  onDelete,
  onNewChat,
}: ChatHistoryListProps) {
  const { theme } = useTheme();
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [isNewChatPressed, setIsNewChatPressed] = useState(false);

  const newChatButtonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: isNewChatPressed ? theme.colors.background.secondary : 'transparent',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    color: theme.colors.text.accent,
    WebkitTapHighlightColor: 'transparent',
    transition: 'background-color 0.1s ease-out',
  };

  const chatItemStyle = (isSelected: boolean, isPressed: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '14px 16px',
    backgroundColor: isPressed ? theme.colors.background.tertiary : isSelected ? theme.colors.background.secondary : 'transparent',
    borderRadius: '8px',
    margin: '0 8px',
    cursor: 'pointer',
    transition: 'background-color 0.1s ease-out',
  });

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <button
        style={newChatButtonStyle}
        onClick={onNewChat}
        onTouchStart={() => setIsNewChatPressed(true)}
        onTouchEnd={() => setIsNewChatPressed(false)}
        onTouchCancel={() => setIsNewChatPressed(false)}
      >
        <IoAddOutline size={20} />
        <Text variant="accent" style={{ fontWeight: 500 }}>New conversation</Text>
      </button>

      {chats.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Text variant="muted">No conversations yet</Text>
        </div>
      ) : (
        <div style={{ paddingTop: '8px' }}>
          {chats.map((chat) => (
            <SwipeableListItem
              key={chat.id}
              onDelete={() => onDelete(chat.id)}
            >
              <div
                style={chatItemStyle(chat.id === selectedId, pressedId === chat.id)}
                onClick={() => onSelect(chat.id)}
                onTouchStart={() => setPressedId(chat.id)}
                onTouchEnd={() => setPressedId(null)}
                onTouchCancel={() => setPressedId(null)}
              >
                <Text
                  variant="primary"
                  style={{
                    fontWeight: chat.id === selectedId ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {chat.title}
                </Text>
                {chat.preview && (
                  <Text
                    variant="muted"
                    style={{
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chat.preview}
                  </Text>
                )}
              </div>
            </SwipeableListItem>
          ))}
        </div>
      )}
    </div>
  );
}
