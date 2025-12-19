import { useEntries } from '../hooks/useEntries';
import EntriesSidebar from '../components/entries/EntriesSidebar';
import EntryDetail from '../components/entries/EntryDetail';
import '../styles/entries.css';

export default function Entries() {
  const {
    entries,
    selectedEntry,
    selectedEntryId,
    isLoading,
    selectEntry,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useEntries();

  if (isLoading) {
    return <div className="entries-layout">Loading...</div>;
  }

  return (
    <div className="entries-layout">
      <EntriesSidebar
        entries={entries}
        selectedId={selectedEntryId}
        onSelectEntry={selectEntry}
        onCreateEntry={createEntry}
        onDeleteEntry={deleteEntry}
        onUpdateEntry={updateEntry}
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
