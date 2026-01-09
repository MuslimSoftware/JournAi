import { useState, CSSProperties } from 'react';
import { IoClose } from 'react-icons/io5';
import Modal from './Modal';
import SettingsSidebar from './settings/SettingsSidebar';
import PersonalizationSection from './settings/PersonalizationSection';
import AISection from './settings/AISection';
import MemorySection from './settings/MemorySection';
import DataManagementSection from './settings/DataManagementSection';
import { useTheme } from '../contexts/ThemeContext';
import IconButton from './themed/IconButton';
import { useIsMobile } from '../hooks/useMediaQuery';
import BottomSheet from './mobile/BottomSheet';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'personalization', label: 'Personalization' },
  { id: 'ai', label: 'AI' },
  { id: 'memory', label: 'Memory' },
  { id: 'data-management', label: 'Data Management' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState('personalization');
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  const contentStyle: CSSProperties = {
    display: 'flex',
    height: '420px',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.colors.border.primary}`,
  };

  const titleStyle: CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: theme.colors.text.primary,
    margin: 0,
  };

  const content = (
    <>
      {isMobile ? (
        <div style={{ padding: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: activeSection === section.id
                    ? theme.colors.text.primary
                    : theme.colors.background.secondary,
                  color: activeSection === section.id
                    ? theme.colors.background.primary
                    : theme.colors.text.secondary,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {section.label}
              </button>
            ))}
          </div>
          {activeSection === 'personalization' && <PersonalizationSection />}
          {activeSection === 'ai' && <AISection />}
          {activeSection === 'memory' && <MemorySection />}
          {activeSection === 'data-management' && <DataManagementSection />}
        </div>
      ) : (
        <div style={contentStyle}>
          <SettingsSidebar
            items={SECTIONS}
            activeId={activeSection}
            onSelect={setActiveSection}
          />
          <div style={mainStyle}>
            {activeSection === 'personalization' && <PersonalizationSection />}
            {activeSection === 'ai' && <AISection />}
            {activeSection === 'memory' && <MemorySection />}
            {activeSection === 'data-management' && <DataManagementSection />}
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings" height="full">
        {content}
      </BottomSheet>
    );
  }

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
      {content}
    </Modal>
  );
}
