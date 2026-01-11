import { useTheme } from '../../contexts/ThemeContext';
import type { InsightTab } from '../../types/analytics';

interface CategoryTabsProps {
  activeTab: InsightTab;
  onTabChange: (tab: InsightTab) => void;
  emotionsCount: number;
  peopleCount: number;
}

export default function CategoryTabs({
  activeTab,
  onTabChange,
  emotionsCount,
  peopleCount,
}: CategoryTabsProps) {
  const { theme } = useTheme();

  const tabs: { id: InsightTab; label: string; count: number }[] = [
    { id: 'emotions', label: 'Emotions', count: emotionsCount },
    { id: 'people', label: 'People', count: peopleCount },
  ];

  return (
    <div className="category-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`category-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === tab.id ? theme.colors.text.accent : theme.colors.text.muted,
            borderBottomColor: activeTab === tab.id ? theme.colors.text.accent : 'transparent',
          }}
        >
          {tab.label}
          <span className="category-tab-count" style={{ color: theme.colors.text.muted }}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
