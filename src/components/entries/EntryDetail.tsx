import { Text } from '../themed';
import { JournalEntry } from '../../types/entry';
import { formatFullDate } from '../../utils/dateFormatting';

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
      <div className="entry-detail-header">
        <div className="entry-detail-title">
          <Text as="h1" variant="primary">{entry.title}</Text>
        </div>
        <div className="entry-detail-date">
          <Text variant="muted">{formatFullDate(entry.date)}</Text>
        </div>
      </div>
      <div className="entry-detail-content">
        <Text as="p" variant="secondary">{entry.content}</Text>
      </div>
    </div>
  );
}
