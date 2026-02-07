import { useState, useEffect, useCallback } from 'react';
import { IoCloudUploadOutline, IoFolderOpenOutline } from 'react-icons/io5';
import { listen } from '@tauri-apps/api/event';
import { useIsMobile } from '../../hooks/useMediaQuery';
import Button from '../themed/Button';

interface DropZoneProps {
  onDrop: (path: string) => void;
  onBrowse: () => void;
  disabled?: boolean;
}

interface TauriDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

export default function DropZone({ onDrop, onBrowse, disabled }: DropZoneProps) {
  const isMobile = useIsMobile();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (payload: TauriDropPayload) => {
      if (disabled) return;
      setIsDragOver(false);
      const path = payload.paths?.[0];
      if (path) onDrop(path);
    },
    [disabled, onDrop]
  );

  useEffect(() => {
    if (isMobile) return;

    const unlistenDrop = listen<TauriDropPayload>('tauri://drag-drop', (event) => {
      handleDrop(event.payload);
    });

    const unlistenEnter = listen('tauri://drag-enter', () => {
      if (!disabled) setIsDragOver(true);
    });

    const unlistenLeave = listen('tauri://drag-leave', () => {
      setIsDragOver(false);
    });

    return () => {
      unlistenDrop.then((fn) => fn());
      unlistenEnter.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [isMobile, disabled, handleDrop]);

  if (isMobile) {
    return (
      <Button
        variant="secondary"
        icon={<IoFolderOpenOutline size={14} />}
        disabled={disabled}
        onClick={onBrowse}
      >
        Browse
      </Button>
    );
  }

  return (
    <div
      className={`settings-drop-zone${isDragOver ? ' settings-drop-zone--active' : ''}`}
      onClick={() => { if (!disabled) onBrowse(); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && !disabled) onBrowse(); }}
    >
      <span className="settings-drop-zone__icon">
        <IoCloudUploadOutline size={28} />
      </span>
      <span>Drag & drop or click to browse</span>
      <span className="settings-drop-zone__hint">Accepts .json files and CSV folders</span>
    </div>
  );
}
