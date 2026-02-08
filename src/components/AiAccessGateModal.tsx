import Modal from './Modal';
import { Button, Text } from './themed';

interface AiAccessGateModalProps {
  isOpen: boolean;
  destinationLabel: string | null;
  onCancel: () => void;
  onGoToSettings: () => void;
}

export default function AiAccessGateModal({
  isOpen,
  destinationLabel,
  onCancel,
  onGoToSettings,
}: AiAccessGateModalProps) {
  const target = destinationLabel ?? 'this page';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="settings-modal-content">
        <Text as="h3" variant="primary" className="settings-modal__title">
          OpenAI API key required
        </Text>
        <Text variant="secondary" className="settings-modal__description">
          {target} requires an OpenAI API key to use AI features. Add your key in Settings.
        </Text>
        <div className="settings-modal__actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onGoToSettings}>
            Go to Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
}
