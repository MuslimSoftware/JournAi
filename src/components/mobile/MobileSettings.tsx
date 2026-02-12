import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { IoChevronBack, IoChevronForward, IoLockClosedOutline, IoSearchOutline } from 'react-icons/io5';
import PersonalizationSection from '../settings/PersonalizationSection';
import SecuritySection from '../settings/SecuritySection';
import AISection from '../settings/AISection';
import MemorySection from '../settings/MemorySection';
import DataManagementSection from '../settings/DataManagementSection';
import { useAiAccess } from '../../contexts/AiAccessContext';
import '../../styles/settings.css';
import '../../styles/themed.css';

interface MobileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
  openSignal?: number;
}

type SectionId = 'personalization' | 'security' | 'ai' | 'memory' | 'data-management';

const GROUPS = [
  { id: 'general', label: 'General' },
  { id: 'ai', label: 'AI & Memory' },
  { id: 'data', label: 'Data' },
];

const SETTINGS_SECTIONS: Array<{
  id: SectionId;
  label: string;
  group: string;
  hasAdvanced?: boolean;
  requiresApiKey?: boolean;
  component: ComponentType;
}> = [
  {
    id: 'personalization',
    label: 'Personalization',
    group: 'general',
    component: PersonalizationSection,
  },
  {
    id: 'security',
    label: 'Security',
    group: 'general',
    component: SecuritySection,
  },
  {
    id: 'ai',
    label: 'AI',
    group: 'ai',
    hasAdvanced: true,
    component: AISection,
  },
  {
    id: 'memory',
    label: 'Memory & RAG',
    group: 'ai',
    hasAdvanced: true,
    requiresApiKey: true,
    component: MemorySection,
  },
  {
    id: 'data-management',
    label: 'Data Management',
    group: 'data',
    component: DataManagementSection,
  },
];

const groupLabels = GROUPS.reduce<Record<string, string>>((acc, group) => {
  acc[group.id] = group.label;
  return acc;
}, {});

export default function MobileSettings({
  isOpen,
  onClose,
  initialSection,
  openSignal = 0,
}: MobileSettingsProps) {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { hasApiKey, requestAiAccess } = useAiAccess();

  useEffect(() => {
    if (!isOpen) {
      setActiveSection(null);
      setSearchQuery('');
      return;
    }
    // On mobile, opening Settings from the nav should land on the section list.
    // Keep explicit deep-links (e.g. openSettings('ai')) working.
    const validSection = SETTINGS_SECTIONS.find((s) => s.id === initialSection);
    setActiveSection(validSection && initialSection !== 'personalization' ? validSection.id : null);
    setSearchQuery('');
  }, [initialSection, isOpen, openSignal]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = (section: typeof SETTINGS_SECTIONS[number]) => {
      if (!query) return true;
      const haystack = `${section.label} ${groupLabels[section.group]}`.toLowerCase();
      return haystack.includes(query);
    };

    const filteredSections = SETTINGS_SECTIONS.filter(matches);

    return GROUPS.map((group) => ({
      ...group,
      sections: filteredSections.filter((section) => section.group === group.id),
    })).filter((group) => group.sections.length > 0);
  }, [searchQuery]);

  if (!isOpen) {
    return null;
  }

  const activeSectionConfig = SETTINGS_SECTIONS.find((section) => section.id === activeSection);
  const ActiveSectionComponent = activeSectionConfig?.component;

  return (
    <div className="mobile-settings" role="dialog" aria-modal="true">
      <div className="mobile-settings__header">
        {activeSection ? (
          <button
            type="button"
            className="mobile-settings__text-button"
            onClick={() => setActiveSection(null)}
            aria-label="Back to settings list"
          >
            <IoChevronBack size={18} className="app-icon" />
            Settings
          </button>
        ) : (
          <span className="mobile-settings__header-spacer" />
        )}
        <h1 className="mobile-settings__title">
          {activeSectionConfig ? activeSectionConfig.label : 'Settings'}
        </h1>
        {!activeSection ? (
          <button
            type="button"
            className="mobile-settings__text-button mobile-settings__done-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            Done
          </button>
        ) : (
          <span className="mobile-settings__header-spacer" />
        )}
      </div>

      <div className="mobile-settings__content">
        {activeSectionConfig && ActiveSectionComponent ? (
          <div className="mobile-settings__section">
            <div className="mobile-settings__section-content">
              <ActiveSectionComponent />
            </div>
          </div>
        ) : (
          <>
            <div className="mobile-settings__search">
              <IoSearchOutline className="mobile-settings__search-icon app-icon" size={16} />
              <input
                type="search"
                placeholder="Search settings"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="mobile-settings__search-input"
                aria-label="Search settings"
              />
            </div>

            {filteredGroups.length === 0 ? (
              <div className="mobile-settings__empty">
                No settings matched your search.
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id} className="mobile-settings__group">
                  <div className="mobile-settings__group-title">{group.label}</div>
                  <div className="mobile-settings__group-card">
                    {group.sections.map((section) => {
                      const isLocked = Boolean(section.requiresApiKey && !hasApiKey);

                      return (
                        <button
                          key={section.id}
                          type="button"
                          className={`mobile-settings__row${isLocked ? ' mobile-settings__row--locked' : ''}`}
                          onClick={() => {
                            if (isLocked) {
                              requestAiAccess(section.label);
                              return;
                            }
                            setActiveSection(section.id);
                          }}
                          aria-label={`Open ${section.label} settings`}
                        >
                          <div className="mobile-settings__row-text">
                            <div className="mobile-settings__row-title">{section.label}</div>
                          </div>
                          {isLocked ? (
                            <IoLockClosedOutline className="mobile-settings__lock-icon app-icon" size={16} />
                          ) : (
                            <IoChevronForward className="mobile-settings__chevron app-icon" size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
