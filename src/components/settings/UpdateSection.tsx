import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';
import { IoCheckmarkCircle, IoRefresh, IoDownload } from 'react-icons/io5';
import Text from '../themed/Text';
import Button from '../themed/Button';
import { useUpdate } from '../../contexts/UpdateContext';
import '../../styles/settings.css';

export default function UpdateSection() {
  const {
    updateAvailable,
    updateInfo,
    checking,
    downloading,
    downloadProgress,
    error,
    checkForUpdate,
    installUpdate,
  } = useUpdate();
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    getVersion().then(setCurrentVersion);
  }, []);

  return (
    <div>
      <div className="settings-section">
        <Text as="h3" variant="primary" className="settings-section-header">
          Application Update
        </Text>

        {updateAvailable && updateInfo ? (
          <>
            <div className="settings-stat-box">
              <div className="settings-stat-row">
                <span className="settings-stat-label">Current version</span>
                <span className="settings-stat-value">{currentVersion}</span>
              </div>
              <div className="settings-stat-row">
                <span className="settings-stat-label">Available version</span>
                <span className="settings-stat-value">{updateInfo.version}</span>
              </div>
            </div>

            {updateInfo.body && (
              <p className="settings-section-description">{updateInfo.body}</p>
            )}

            {downloading ? (
              <div>
                <div className="settings-progress-container">
                  <div
                    className={`settings-progress-bar ${downloadProgress === 0 ? 'settings-progress-bar--indeterminate' : ''}`}
                    style={{ width: `${downloadProgress || 100}%` }}
                  />
                </div>
                <span className="settings-progress-text">
                  {downloadProgress > 0 ? `${downloadProgress}%` : 'Preparing...'}
                </span>
              </div>
            ) : (
              <Button onClick={installUpdate}>
                <IoDownload size={14} />
                Download & Install
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="settings-status settings-status--success">
              <IoCheckmarkCircle className="settings-status__icon" />
              <span>You are running the latest version{currentVersion ? ` (${currentVersion})` : ''}</span>
            </div>

            <div style={{ marginTop: 'var(--settings-spacing-xl)' }}>
              <Button variant="secondary" onClick={checkForUpdate} disabled={checking}>
                <IoRefresh size={14} className={checking ? 'spin' : ''} />
                {checking ? 'Checking...' : 'Check for Updates'}
              </Button>
            </div>
          </>
        )}

        {error && (
          <div className="settings-status settings-status--error" style={{ marginTop: 'var(--settings-spacing-lg)' }}>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
