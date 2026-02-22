import { useState, useRef, useEffect } from 'react';
import { TextArea } from '../themed';
import { STICKY_NOTE_DEBOUNCE_MS } from './constants';

interface StickyNoteProps {
  id: string;
  content: string;
  onUpdate: (id: string, content: string) => void;
}

export default function StickyNote({ id, content, onUpdate }: StickyNoteProps) {
  const [value, setValue] = useState(content);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const lastSavedRef = useRef(content);

  useEffect(() => {
    if (content !== lastSavedRef.current) {
      setValue(content);
      lastSavedRef.current = content;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastSavedRef.current = newValue;
      onUpdate(id, newValue);
    }, STICKY_NOTE_DEBOUNCE_MS);
  };

  return (
    <div className="sticky-note">
      <TextArea
        value={value}
        onChange={handleChange}
        placeholder="Write a note..."
        className="sticky-note-textarea"
      />
    </div>
  );
}
