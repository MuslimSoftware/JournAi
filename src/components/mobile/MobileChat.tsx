import { CSSProperties, useCallback, useState } from 'react';
import { IoAddOutline, IoTimeOutline } from 'react-icons/io5';
import { FiPlus } from 'react-icons/fi';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useChats } from '../../hooks/useChats';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatContainer } from '../chat';
import { Text } from '../themed';
import { CHAT } from '../chat/constants';
import MobilePageHeader from './MobilePageHeader';
import SideDrawer from './SideDrawer';
import SwipeableListItem from './SwipeableListItem';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import type { Chat } from '../../types/chatHistory';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import '../../styles/mobile.css';

export default function MobileChat() {
  const { theme } = useTheme();
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const [showHistory, setShowHistory] = useState(false);

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

  const handleNewChatFromHeader = useCallback(async () => {
    hapticImpact('light');
    await createChat();
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

  const handleHistoryClick = useCallback(() => {
    hapticSelection();
    setShowHistory(true);
  }, []);

  const inputWrapperStyle: CSSProperties = {
    paddingBottom: isKeyboardOpen ? '0' : 'calc(var(--mobile-nav-height) + var(--mobile-safe-area-bottom))',
    transition: `padding-bottom ${CHAT.transition.layout}`,
  };

  const currentTitle = selectedChat?.title || 'New Chat';

  return (
    <div className="mobile-chat-container">
      <MobilePageHeader
        centerContent={
          <Text variant="primary" className="mobile-chat-title">
            {currentTitle}
          </Text>
        }
        rightContent={
          <div className="mobile-chat-header-actions">
            <button
              className="mobile-page-header__action-button"
              onClick={handleNewChatFromHeader}
              aria-label="New chat"
              style={{ color: theme.colors.text.primary }}
            >
              <FiPlus size={24} />
            </button>
            <button
              className="mobile-page-header__action-button"
              onClick={handleHistoryClick}
              aria-label="Chat history"
              style={{ color: theme.colors.text.primary }}
            >
              <IoTimeOutline size={22} />
            </button>
          </div>
        }
      />

      <ChatContainer
        chatId={selectedChatId}
        onTitleGenerated={handleTitleGenerated}
        onMessageAdded={handleMessageAdded}
        onCreateChat={createChat}
        inputWrapperStyle={inputWrapperStyle}
        style={{ flex: 1 }}
      />

      <SideDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Conversations"
        side="right"
        disableSafeAreaBottom
      >
        <ChatHistoryList
          chats={chats}
          selectedId={selectedChatId}
          onSelect={handleSelectChat}
          onDelete={handleDeleteChat}
          onNewChat={handleNewChat}
        />
      </SideDrawer>
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

  const newChatButtonClass = `mobile-chat-new-button${isNewChatPressed ? ' mobile-chat-new-button--pressed' : ''}`;

  const chatsWithDate = chats.map(chat => ({ ...chat, date: chat.updatedAt }));
  const groupedChats = groupEntriesByDate(chatsWithDate);

  const getChatItemClass = (id: string) => {
    let className = 'mobile-chat-item';
    if (id === selectedId) className += ' mobile-chat-item--selected';
    if (pressedId === id) className += ' mobile-chat-item--pressed';
    return className;
  };

  return (
    <div className="mobile-chat-history">
      <button
        className={newChatButtonClass}
        onClick={onNewChat}
        onTouchStart={() => setIsNewChatPressed(true)}
        onTouchEnd={() => setIsNewChatPressed(false)}
        onTouchCancel={() => setIsNewChatPressed(false)}
      >
        <IoAddOutline size={20} />
        <Text variant="primary" className="mobile-chat-new-text">New conversation</Text>
      </button>

      {chats.length === 0 ? (
        <div className="mobile-chat-empty">
          <Text variant="muted">No conversations yet</Text>
        </div>
      ) : (
        <div className="mobile-chat-list">
          {Array.from(groupedChats).map(([group, groupChats]) => (
            <div key={group} className="mobile-chat-group">
              <div
                className="mobile-chat-group-header"
                style={{ color: theme.colors.text.muted }}
              >
                {group}
              </div>
              {groupChats.map((chat) => (
                <SwipeableListItem
                  key={chat.id}
                  onDelete={() => onDelete(chat.id)}
                >
                  <div
                    className={getChatItemClass(chat.id)}
                    onClick={() => onSelect(chat.id)}
                    onTouchStart={() => setPressedId(chat.id)}
                    onTouchEnd={() => setPressedId(null)}
                    onTouchCancel={() => setPressedId(null)}
                  >
                    <Text
                      variant="primary"
                      className={`mobile-chat-item__title${chat.id === selectedId ? ' mobile-chat-item__title--selected' : ''}`}
                    >
                      {chat.title}
                    </Text>
                    {chat.preview && (
                      <Text variant="muted" className="mobile-chat-item__preview">
                        {chat.preview}
                      </Text>
                    )}
                  </div>
                </SwipeableListItem>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
