import { Text } from '../themed';
import { JournalEntry } from '../../types/entry';

interface EntryDetailProps {
  entry: JournalEntry | null;
}

export default function EntryDetail({ entry }: EntryDetailProps) {
  if (!entry) {
    return (
      <div className="entries-empty-state">
        <Text variant="muted">Select an entry to view its content</Text>
      </div>
    );
  }

  return (
    <div className="entries-content">
      <div className="entry-detail-content">
        <Text as="p" variant="secondary">{entry.content}</Text>
      </div>
    </div>
  );
}
