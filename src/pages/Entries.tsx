import { useEntries } from '../hooks/useEntries';
import { useFocusMode } from '../contexts/FocusModeContext';
import EntriesSidebar from '../components/entries/EntriesSidebar';
import EntryDetail from '../components/entries/EntryDetail';
import '../styles/entries.css';
import '../styles/focus-mode.css';

export default function Entries() {
  const { isFocusMode } = useFocusMode();
  const {
    entries,
    totalCount,
    selectedEntry,
    selectedEntryId,
    isLoading,
    isLoadingMore,
    hasMore,
    selectEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    loadMore,
  } = useEntries();

  if (isLoading) {
    return <div className="entries-layout">Loading...</div>;
  }

  return (
    <div className={`entries-layout ${isFocusMode ? 'focus-mode' : ''}`}>
      <EntriesSidebar
        entries={entries}
        totalCount={totalCount}
        selectedId={selectedEntryId}
        onSelectEntry={selectEntry}
        onCreateEntry={createEntry}
        onDeleteEntry={deleteEntry}
        onUpdateEntry={updateEntry}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      />
      <EntryDetail
        entry={selectedEntry}
        hasEntries={entries.length > 0}
        onUpdate={updateEntry}
        onCreateEntry={createEntry}
      />
    </div>
  );
}
