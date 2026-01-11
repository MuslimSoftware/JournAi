import { useIsMobile } from '../hooks/useMediaQuery';
import { useEntries } from '../hooks/useEntries';
import { useFocusMode } from '../contexts/FocusModeContext';
import { Spinner } from '../components/themed';
import EntriesSidebar from '../components/entries/EntriesSidebar';
import EntryDetail from '../components/entries/EntryDetail';
import MobileEntries from '../components/mobile/MobileEntries';
import '../styles/entries.css';
import '../styles/focus-mode.css';

export default function Entries() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileEntries />;
  }

  return <DesktopEntries />;
}

function DesktopEntries() {
  const { isFocusMode } = useFocusMode();
  const {
    entries,
    totalCount,
    selectedEntry,
    selectedEntryId,
    highlightRange,
    clearHighlight,
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
    return (
      <div className="entries-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
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
        highlightRange={highlightRange}
        onUpdate={updateEntry}
        onCreateEntry={createEntry}
        onClearHighlight={clearHighlight}
      />
    </div>
  );
}
