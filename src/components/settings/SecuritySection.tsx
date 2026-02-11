import { useMemo, useState } from 'react';
import { IoCheckmarkCircle, IoKeyOutline, IoLockClosed, IoWarning } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppLock } from '../../contexts/AppLockContext';
import { Button, Text } from '../themed';
import '../../styles/settings.css';

const MIN_PASSPHRASE_LENGTH = 8;

const LOCK_TIMEOUT_OPTIONS = [
  { value: 0, label: 'Immediately on background' },
  { value: 60, label: 'After 1 minute' },
  { value: 300, label: 'After 5 minutes' },
] as const;

function normalizeInput(value: string): string {
  return value.trim();
}

export default function SecuritySection() {
  const { mode } = useTheme();
  const {
    configured,
    lockNow,
    configure,
    disable,
    changePassphrase,
    lockTimeoutSeconds,
    setLockTimeout,
  } = useAppLock();

  const [setupPassphrase, setSetupPassphrase] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [newPassphraseConfirm, setNewPassphraseConfirm] = useState('');
  const [disablePassphrase, setDisablePassphrase] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'saving'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const inputBg = isDark ? '#2a2a2a' : '#e8e8e8';

  const canEnableLock = useMemo(() => {
    const passphrase = normalizeInput(setupPassphrase);
    const confirm = normalizeInput(setupConfirm);
    return passphrase.length >= MIN_PASSPHRASE_LENGTH && passphrase === confirm;
  }, [setupConfirm, setupPassphrase]);

  const canChangePassphrase = useMemo(() => {
    const current = normalizeInput(currentPassphrase);
    const next = normalizeInput(newPassphrase);
    const confirm = normalizeInput(newPassphraseConfirm);

    return current.length > 0 && next.length >= MIN_PASSPHRASE_LENGTH && next === confirm;
  }, [currentPassphrase, newPassphrase, newPassphraseConfirm]);

  const canDisableLock = useMemo(() => {
    return normalizeInput(disablePassphrase).length > 0;
  }, [disablePassphrase]);

  const showStatus = (nextStatus: 'success' | 'error', message: string) => {
    setStatus(nextStatus);
    setStatusMessage(message);
  };

  const handleEnable = async () => {
    if (!canEnableLock) {
      showStatus('error', `Passphrase must match and be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }

    setStatus('saving');
    setStatusMessage('');
    try {
      await configure(normalizeInput(setupPassphrase));
      setSetupPassphrase('');
      setSetupConfirm('');
      showStatus('success', 'App lock enabled.');
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Failed to enable app lock.');
    }
  };

  const handleDisable = async () => {
    if (!canDisableLock) return;

    setStatus('saving');
    setStatusMessage('');
    try {
      await disable(normalizeInput(disablePassphrase));
      setDisablePassphrase('');
      setShowDisableForm(false);
      showStatus('success', 'App lock disabled.');
    } catch (error) {
      showStatus('error', typeof error === 'string' ? error : error instanceof Error ? error.message : 'Incorrect passphrase.');
    }
  };

  const handleChangePassphrase = async () => {
    if (!canChangePassphrase) {
      showStatus('error', `Passphrase must match and be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }

    setStatus('saving');
    setStatusMessage('');
    try {
      await changePassphrase(normalizeInput(currentPassphrase), normalizeInput(newPassphrase));
      setCurrentPassphrase('');
      setNewPassphrase('');
      setNewPassphraseConfirm('');
      setShowChangeForm(false);
      showStatus('success', 'Passphrase updated.');
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Failed to update passphrase.');
    }
  };

  const handleLockTimeoutChange = async (seconds: number) => {
    setStatus('saving');
    setStatusMessage('');
    try {
      await setLockTimeout(seconds);
      showStatus('success', 'Lock timeout updated.');
    } catch {
      showStatus('error', 'Failed to update lock timeout.');
    }
  };

  const handleLockNow = async () => {
    try {
      await lockNow();
    } catch {
      showStatus('error', 'Failed to lock app.');
    }
  };

  return (
    <div>
      <Text as="h3" variant="primary" className="settings-section__title">
        Security
      </Text>
      <p className="settings-section__description">
        Protect access to JournAi with a passphrase lock. While locked, journal content stays hidden until unlocked.
      </p>

      {!configured ? (
        <>
          <div className="settings-field">
            <label className="settings-label">New passphrase</label>
            <input
              type="password"
              value={setupPassphrase}
              onChange={(event) => setSetupPassphrase(event.target.value)}
              className="settings-input settings-input--full-padding"
              style={{ backgroundColor: inputBg }}
              autoComplete="new-password"
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Confirm passphrase</label>
            <input
              type="password"
              value={setupConfirm}
              onChange={(event) => setSetupConfirm(event.target.value)}
              className="settings-input settings-input--full-padding"
              style={{ backgroundColor: inputBg }}
              autoComplete="new-password"
            />
          </div>
          <div className="settings-footer">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEnable}
              disabled={!canEnableLock || status === 'saving'}
            >
              {status === 'saving' ? 'Enabling...' : 'Enable App Lock'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="settings-field settings-advanced">
            <label className="settings-label">Lock timeout</label>
            <select
              value={lockTimeoutSeconds}
              onChange={(event) => {
                void handleLockTimeoutChange(Number(event.target.value));
              }}
              className="settings-select"
              style={{ backgroundColor: inputBg }}
            >
              {LOCK_TIMEOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field settings-security-actions">
            <Button variant="secondary" size="sm" icon={<IoLockClosed size={13} />} onClick={handleLockNow}>
              Lock Now
            </Button>
            {!showDisableForm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setShowDisableForm(true); setShowChangeForm(false); }}
              >
                Disable
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowDisableForm(false); setDisablePassphrase(''); }}
              >
                Cancel
              </Button>
            )}
          </div>

          {showDisableForm && (
            <>
              <div className="settings-field">
                <label className="settings-label">Enter passphrase to disable</label>
                <input
                  type="password"
                  value={disablePassphrase}
                  onChange={(event) => setDisablePassphrase(event.target.value)}
                  className="settings-input settings-input--full-padding"
                  style={{ backgroundColor: inputBg }}
                  autoComplete="current-password"
                />
              </div>
              <div className="settings-footer">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDisable}
                  disabled={!canDisableLock || status === 'saving'}
                >
                  {status === 'saving' ? 'Disabling...' : 'Confirm Disable'}
                </Button>
              </div>
            </>
          )}

          <div className="settings-section-divider" />

          {!showChangeForm ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<IoKeyOutline size={14} />}
              onClick={() => { setShowChangeForm(true); setShowDisableForm(false); }}
            >
              Change Passphrase
            </Button>
          ) : (
            <>
              <div className="settings-field">
                <label className="settings-label">Current passphrase</label>
                <input
                  type="password"
                  value={currentPassphrase}
                  onChange={(event) => setCurrentPassphrase(event.target.value)}
                  className="settings-input settings-input--full-padding"
                  style={{ backgroundColor: inputBg }}
                  autoComplete="current-password"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">New passphrase</label>
                <input
                  type="password"
                  value={newPassphrase}
                  onChange={(event) => setNewPassphrase(event.target.value)}
                  className="settings-input settings-input--full-padding"
                  style={{ backgroundColor: inputBg }}
                  autoComplete="new-password"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">Confirm new passphrase</label>
                <input
                  type="password"
                  value={newPassphraseConfirm}
                  onChange={(event) => setNewPassphraseConfirm(event.target.value)}
                  className="settings-input settings-input--full-padding"
                  style={{ backgroundColor: inputBg }}
                  autoComplete="new-password"
                />
              </div>

              <div className="settings-footer settings-security-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleChangePassphrase}
                  disabled={!canChangePassphrase || status === 'saving'}
                >
                  {status === 'saving' ? 'Saving...' : 'Update Passphrase'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowChangeForm(false);
                    setCurrentPassphrase('');
                    setNewPassphrase('');
                    setNewPassphraseConfirm('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {status === 'success' && (
        <span className="settings-status settings-status--success">
          <IoCheckmarkCircle size={14} /> {statusMessage}
        </span>
      )}
      {status === 'error' && (
        <span className="settings-status settings-status--error">
          <IoWarning size={14} /> {statusMessage}
        </span>
      )}
    </div>
  );
}
