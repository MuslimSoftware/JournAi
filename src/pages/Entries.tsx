import { useState } from 'react';
import EntriesSidebar from '../components/entries/EntriesSidebar';
import EntryDetail from '../components/entries/EntryDetail';
import { dummyEntries } from '../data/dummyEntries';
import '../styles/entries.css';

export default function Entries() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    dummyEntries.length > 0 ? dummyEntries[0].id : null
  );

  const selectedEntry = dummyEntries.find((e) => e.id === selectedEntryId) || null;

  return (
    <div className="entries-layout">
      <EntriesSidebar
        entries={dummyEntries}
        selectedId={selectedEntryId}
        onSelectEntry={setSelectedEntryId}
      />
      <EntryDetail entry={selectedEntry} />
    </div>
  );
}
