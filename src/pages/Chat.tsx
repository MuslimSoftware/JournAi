import { useCallback } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useChats } from '../hooks/useChats';
import { ChatContainer, ChatSidebar } from '../components/chat';
import { Spinner } from '../components/themed';
import MobileChat from '../components/mobile/MobileChat';
import '../styles/chat.css';

export default function Chat() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileChat />;
  }

  return <DesktopChat />;
}

function DesktopChat() {
  const {
    chats,
    totalCount,
    selectedChatId,
    isLoading,
    isLoadingMore,
    hasMore,
    selectChat,
    createChat,
    updateChat,
    deleteChat,
    loadMore,
    refreshChats,
  } = useChats();

  const handleTitleGenerated = useCallback((chatId: string, title: string) => {
    updateChat(chatId, { title });
  }, [updateChat]);

  const handleMessageAdded = useCallback(async (_chatId: string) => {
    await refreshChats();
  }, [refreshChats]);

  if (isLoading && chats.length === 0) {
    return (
      <div className="chat-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <ChatSidebar
        chats={chats}
        totalCount={totalCount}
        selectedId={selectedChatId}
        onSelectChat={selectChat}
        onCreateChat={createChat}
        onDeleteChat={deleteChat}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      />
      <ChatContainer
        chatId={selectedChatId}
        onTitleGenerated={handleTitleGenerated}
        onMessageAdded={handleMessageAdded}
        onCreateChat={createChat}
      />
    </div>
  );
}
