import { useEffect, useState, CSSProperties, useMemo } from 'react';
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
import MobileSettings from './mobile/MobileSettings';
import type { SettingsSection } from '../contexts/SettingsContext';
import { useAiAccess } from '../contexts/AiAccessContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
  openSignal?: number;
}

const SECTIONS = [
  { id: 'personalization', label: 'Personalization' },
  { id: 'ai', label: 'AI' },
  { id: 'memory', label: 'Memory & RAG', requiresApiKey: true },
  { id: 'data-management', label: 'Data Management' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  initialSection = 'personalization',
  openSignal = 0,
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const { theme } = useTheme();
  const { hasApiKey, requestAiAccess } = useAiAccess();
  const isMobile = useIsMobile();

  const sectionItems = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        locked: Boolean(section.requiresApiKey && !hasApiKey),
      })),
    [hasApiKey],
  );

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [initialSection, isOpen, openSignal]);

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

  if (isMobile) {
    return (
      <MobileSettings
        isOpen={isOpen}
        onClose={onClose}
        initialSection={initialSection}
        openSignal={openSignal}
      />
    );
  }

  const handleSectionSelect = (sectionId: string) => {
    const selectedSection = sectionItems.find((section) => section.id === sectionId);
    if (!selectedSection) {
      return;
    }

    if (selectedSection.locked) {
      requestAiAccess(selectedSection.label);
      return;
    }

    setActiveSection(sectionId as SettingsSection);
  };

  const content = (
    <div style={contentStyle}>
      <SettingsSidebar
        items={sectionItems}
        activeId={activeSection}
        onSelect={handleSectionSelect}
      />
      <div style={mainStyle}>
        {activeSection === 'personalization' && <PersonalizationSection />}
        {activeSection === 'ai' && <AISection />}
        {activeSection === 'memory' && <MemorySection />}
        {activeSection === 'data-management' && <DataManagementSection />}
      </div>
    </div>
  );

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
