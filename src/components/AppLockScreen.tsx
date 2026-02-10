import { FormEvent, useState } from 'react';
import { IoLockClosedOutline } from 'react-icons/io5';
import { useAppLock } from '../contexts/AppLockContext';
import Text from './themed/Text';
import Button from './themed/Button';
import Spinner from './themed/Spinner';

const MIN_PASSPHRASE_LENGTH = 8;

export default function AppLockScreen() {
  const { configured, unlock, configure } = useAppLock();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!configured) {
        const normalized = passphrase.trim();
        if (normalized.length < MIN_PASSPHRASE_LENGTH) {
          setError(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
          return;
        }

        if (normalized !== confirmPassphrase.trim()) {
          setError('Passphrase confirmation does not match.');
          return;
        }

        await configure(normalized);
        setPassphrase('');
        setConfirmPassphrase('');
      } else {
        const ok = await unlock(passphrase);
        if (!ok) {
          setError('Incorrect passphrase. Try again.');
        } else {
          setPassphrase('');
        }
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : null;
      setError(
        message
          || (configured
            ? 'Unable to unlock JournAi right now.'
            : 'Unable to configure app lock right now.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-lock-screen">
      <form className="app-lock-card" onSubmit={handleSubmit}>
        <div className="app-lock-icon" aria-hidden="true">
          <IoLockClosedOutline size={22} />
        </div>
        <Text as="h3" style={{ margin: 0 }}>
          {configured ? 'JournAi is locked' : 'Secure JournAi'}
        </Text>
        <Text as="p" variant="secondary" style={{ margin: 0, fontSize: '0.9rem' }}>
          {configured
            ? 'Enter your app passphrase to continue.'
            : 'Set a passphrase to unlock the encrypted local database.'}
        </Text>

        <Text as="span" variant="secondary" style={{ marginTop: '4px', fontSize: '0.85rem' }}>
          <label htmlFor="app-lock-passphrase">
            {configured ? 'Passphrase' : 'Create passphrase'}
          </label>
        </Text>
        <input
          id="app-lock-passphrase"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          className="app-lock-input"
          autoComplete={configured ? 'current-password' : 'new-password'}
          autoFocus
          disabled={submitting}
        />

        {!configured && (
          <>
            <Text as="span" variant="secondary" style={{ marginTop: '4px', fontSize: '0.85rem' }}>
              <label htmlFor="app-lock-passphrase-confirm">
                Confirm passphrase
              </label>
            </Text>
            <input
              id="app-lock-passphrase-confirm"
              type="password"
              value={confirmPassphrase}
              onChange={(event) => setConfirmPassphrase(event.target.value)}
              className="app-lock-input"
              autoComplete="new-password"
              disabled={submitting}
            />
          </>
        )}

        {error && (
          <Text as="p" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--status-error)' }}>
            {error}
          </Text>
        )}

        <Button
          type="submit"
          variant="secondary"
          size="lg"
          fullWidth
          style={{ marginTop: '4px' }}
          disabled={
            submitting
            || passphrase.trim().length === 0
            || (!configured && confirmPassphrase.trim().length === 0)
          }
        >
          {submitting
            ? <Spinner size="sm" />
            : configured ? 'Unlock' : 'Set Passphrase'}
        </Button>
      </form>
    </div>
  );
}
