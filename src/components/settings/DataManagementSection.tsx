import { useIsMobile } from '../../hooks/useMediaQuery';
import Text from '../themed/Text';
import ImportCard from './ImportCard';
import ExportCard from './ExportCard';
import SyncCard from './SyncCard';
import '../../styles/settings.css';

export default function DataManagementSection() {
  const isMobile = useIsMobile();

  return (
    <div>
      <div className="settings-section">
        <Text as="h3" variant="primary" className="settings-section-header">
          Sync
        </Text>
        <p className="settings-section-description">
          Sync encrypted app data with your own cloud account.
        </p>
        <SyncCard />
      </div>

      <div className="settings-section-divider" />

      <div className="settings-section">
        <Text as="h3" variant="primary" className="settings-section-header">
          Import Data
        </Text>
        <p className="settings-section-description">
          {isMobile
            ? 'Import entries, todos, and sticky notes from a JSON file.'
            : 'Import entries, todos, and sticky notes from JSON or CSV.'}
        </p>
        <ImportCard />
      </div>

      <div className="settings-section-divider" />

      <div className="settings-section">
        <Text as="h3" variant="primary" className="settings-section-header">
          Export Data
        </Text>
        <p className="settings-section-description">
          {isMobile
            ? 'Export entries, todos, and sticky notes as a JSON file. Chats and insights are not included.'
            : 'Export entries, todos, and sticky notes as a JSON bundle or CSV files. Chats and insights are not included.'}
        </p>
        <ExportCard />
      </div>
    </div>
  );
}
