import { FormEvent, useState } from 'react';
import { IoLockClosedOutline } from 'react-icons/io5';
import { useAppLock } from '../contexts/AppLockContext';

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
          <IoLockClosedOutline size={24} />
        </div>
        <h1 className="app-lock-title">{configured ? 'JournAi is locked' : 'Secure JournAi'}</h1>
        <p className="app-lock-subtitle">
          {configured
            ? 'Enter your app passphrase to continue.'
            : 'Set a passphrase to unlock the encrypted local database.'}
        </p>

        <label className="app-lock-label" htmlFor="app-lock-passphrase">
          {configured ? 'Passphrase' : 'Create passphrase'}
        </label>
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
            <label className="app-lock-label" htmlFor="app-lock-passphrase-confirm">
              Confirm passphrase
            </label>
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

        {error && <p className="app-lock-error">{error}</p>}

        <button
          type="submit"
          className="app-lock-submit"
          disabled={
            submitting
            || passphrase.trim().length === 0
            || (!configured && confirmPassphrase.trim().length === 0)
          }
        >
          {submitting ? (configured ? 'Unlocking...' : 'Saving...') : configured ? 'Unlock' : 'Set Passphrase'}
        </button>
      </form>
    </div>
  );
}
