import { Text, TrashButton } from '../themed';
import { NestedSidebar } from '../shared';
import { Chat } from '../../types/chatHistory';
import { useSidebar } from '../../contexts/SidebarContext';
import '../../styles/nested-sidebar.css';
import '../../styles/chat.css';

interface ChatSidebarProps {
  chats: Chat[];
  totalCount: number;
  selectedId: string | null;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export default function ChatSidebar({
  chats,
  totalCount,
  selectedId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ChatSidebarProps) {
  const { chatPinned, toggleChatPin } = useSidebar();

  const renderChatItem = (chat: Chat) => (
    <>
      <div className="chat-list-item-content">
        <div className="chat-list-item-title">
          <Text variant="primary">{chat.title}</Text>
        </div>
        {chat.preview && (
          <div className="chat-list-item-preview">
            <Text variant="muted">{chat.preview}</Text>
          </div>
        )}
      </div>
      <div className="nested-sidebar-item-actions">
        <TrashButton
          label="Delete chat"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteChat(chat.id);
          }}
        />
      </div>
    </>
  );

  return (
    <NestedSidebar
      items={chats}
      totalCount={totalCount}
      selectedId={selectedId}
      onSelectItem={onSelectChat}
      onCreateItem={onCreateChat}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      pinned={chatPinned}
      onTogglePin={toggleChatPin}
      getId={(chat) => chat.id}
      getDateValue={(chat) => chat.updatedAt}
      getSearchableText={(chat) => `${chat.title} ${chat.preview}`}
      renderItem={renderChatItem}
      className="chat-sidebar"
      emptyStateTitle="No chats yet"
      emptyStateSubtitle="Start a conversation"
      emptyStateButtonText="Start new chat"
      searchPlaceholder="Search chats..."
      createButtonLabel="New chat"
      itemName="chat"
      itemNamePlural="chats"
    />
  );
}
