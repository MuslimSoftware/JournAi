import { useState, CSSProperties } from 'react';
import { IoClose } from 'react-icons/io5';
import Modal from './Modal';
import SettingsSidebar from './settings/SettingsSidebar';
import PersonalizationSection from './settings/PersonalizationSection';
import { useTheme } from '../contexts/ThemeContext';
import IconButton from './themed/IconButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'personalization', label: 'Personalization' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState('personalization');
  const { theme } = useTheme();

  const contentStyle: CSSProperties = {
    display: 'flex',
    height: '600px',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    padding: theme.spacing.xl,
    overflowY: 'auto',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.border.primary}`,
  };

  const titleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.h3,
    fontWeight: theme.typography.fontWeight.h3,
    color: theme.colors.text.primary,
    margin: 0,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div style={headerStyle}>
        <h2 style={titleStyle}>Settings</h2>
        <IconButton
          icon={<IoClose />}
          label="Close settings"
          variant="ghost"
          onClick={onClose}
        />
      </div>
      <div style={contentStyle}>
        <SettingsSidebar
          items={SECTIONS}
          activeId={activeSection}
          onSelect={setActiveSection}
        />
        <div style={mainStyle}>
          {activeSection === 'personalization' && <PersonalizationSection />}
        </div>
      </div>
    </Modal>
  );
}
