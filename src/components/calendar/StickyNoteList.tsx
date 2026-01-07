import { FiPlus } from 'react-icons/fi';
import { Text, Button } from '../themed';
import StickyNote from './StickyNote';
import type { StickyNote as StickyNoteType } from '../../types/todo';

interface StickyNoteListProps {
  notes: StickyNoteType[];
  onCreateNote: () => Promise<StickyNoteType | null>;
  onUpdateNote: (id: string, content: string) => Promise<StickyNoteType | null>;
  onDeleteNote: (id: string) => Promise<boolean>;
}

export default function StickyNoteList({ notes, onCreateNote, onUpdateNote, onDeleteNote }: StickyNoteListProps) {
  return (
    <div className="sticky-notes-container">
      <div className="sticky-notes-header">
        <Text as="h4" variant="secondary">Notes</Text>
        <Button variant="ghost" size="sm" onClick={onCreateNote} icon={<FiPlus size={14} />}>
          Add
        </Button>
      </div>

      <div className="sticky-notes-list">
        {notes.length === 0 ? (
          <Text variant="muted" className="sticky-notes-empty">No notes for this day</Text>
        ) : (
          notes.map(note => (
            <StickyNote
              key={note.id}
              id={note.id}
              content={note.content}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
            />
          ))
        )}
      </div>
    </div>
  );
}
