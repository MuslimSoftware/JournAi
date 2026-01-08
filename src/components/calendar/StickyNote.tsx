import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface StickyNoteProps {
  id: string;
  content: string;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export default function StickyNote({ id, content, onUpdate, onDelete }: StickyNoteProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState(content);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(id, newValue);
    }, 500);
  };

  return (
    <div
      className="sticky-note"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Write a note..."
        className="sticky-note-textarea"
      />
      <button
        className="sticky-note-clear"
        onClick={() => onDelete(id)}
      >
        Clear
      </button>
    </div>
  );
}
