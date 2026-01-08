import { CSSProperties, useCallback } from 'react';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useChats } from '../../hooks/useChats';
import { ChatContainer } from '../chat';
import { CHAT } from '../chat/constants';

export default function MobileChat() {
  const { isOpen: isKeyboardOpen } = useKeyboard();
  const { selectedChatId, createChat, updateChat, refreshChats } = useChats();

  const handleTitleGenerated = useCallback((chatId: string, title: string) => {
    updateChat(chatId, { title });
  }, [updateChat]);

  const handleMessageAdded = useCallback(async (_chatId: string) => {
    await refreshChats();
  }, [refreshChats]);

  const inputWrapperStyle: CSSProperties = {
    paddingBottom: isKeyboardOpen ? '0' : 'calc(var(--mobile-safe-area-bottom))',
    transition: `padding-bottom ${CHAT.transition.layout}`,
  };

  return (
    <ChatContainer
      chatId={selectedChatId}
      onTitleGenerated={handleTitleGenerated}
      onMessageAdded={handleMessageAdded}
      onCreateChat={createChat}
      inputWrapperStyle={inputWrapperStyle}
    />
  );
}
