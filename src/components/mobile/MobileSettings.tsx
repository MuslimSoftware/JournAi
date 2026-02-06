import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { IoChevronBack, IoChevronForward, IoSearchOutline } from 'react-icons/io5';
import PersonalizationSection from '../settings/PersonalizationSection';
import AISection from '../settings/AISection';
import MemorySection from '../settings/MemorySection';
import DataManagementSection from '../settings/DataManagementSection';
import '../../styles/settings.css';
import '../../styles/themed.css';

interface MobileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type SectionId = 'personalization' | 'ai' | 'memory' | 'data-management';

const GROUPS = [
  { id: 'general', label: 'General' },
  { id: 'ai', label: 'AI & Memory' },
  { id: 'data', label: 'Data' },
];

const SETTINGS_SECTIONS: Array<{
  id: SectionId;
  label: string;
  description: string;
  group: string;
  hasAdvanced?: boolean;
  component: ComponentType;
}> = [
  {
    id: 'personalization',
    label: 'Personalization',
    description: 'Theme and display preferences',
    group: 'general',
    component: PersonalizationSection,
  },
  {
    id: 'ai',
    label: 'AI',
    description: 'API key and model selection',
    group: 'ai',
    hasAdvanced: true,
    component: AISection,
  },
  {
    id: 'memory',
    label: 'Memory & RAG',
    description: 'Embeddings and entry analysis',
    group: 'ai',
    hasAdvanced: true,
    component: MemorySection,
  },
  {
    id: 'data-management',
    label: 'Data Management',
    description: 'Import and backups',
    group: 'data',
    component: DataManagementSection,
  },
];

const groupLabels = GROUPS.reduce<Record<string, string>>((acc, group) => {
  acc[group.id] = group.label;
  return acc;
}, {});

export default function MobileSettings({ isOpen, onClose }: MobileSettingsProps) {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setActiveSection(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = (section: typeof SETTINGS_SECTIONS[number]) => {
      if (!query) return true;
      const haystack = `${section.label} ${section.description} ${groupLabels[section.group]}`.toLowerCase();
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
            <p className="mobile-settings__section-summary">
              {activeSectionConfig.description}
            </p>
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
                    {group.sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        className="mobile-settings__row"
                        onClick={() => setActiveSection(section.id)}
                        aria-label={`Open ${section.label} settings`}
                      >
                        <div className="mobile-settings__row-text">
                          <div className="mobile-settings__row-title">{section.label}</div>
                          <div className="mobile-settings__row-description">{section.description}</div>
                        </div>
                        <IoChevronForward className="mobile-settings__chevron app-icon" size={16} />
                      </button>
                    ))}
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
