import { useState, useEffect } from 'react';
import { IoEye, IoEyeOff, IoCheckmarkCircle, IoAlertCircle, IoTrash } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from '../Modal';
import { Text, Button } from '../themed';
import { appStore, STORE_KEYS } from '../../lib/store';
import { deleteApiKey, getApiKey, setApiKey } from '../../lib/secureStorage';
import type { OpenAIModel } from '../../types/chat';
import { useIsMobile } from '../../hooks/useMediaQuery';
import '../../styles/settings.css';

const MODELS: { value: OpenAIModel; label: string }[] = [
  { value: 'gpt-5.2', label: 'GPT-5.2 (Recommended)' },
  { value: 'gpt-5.1', label: 'GPT-5.1 (Best Value)' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Budget)' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Fastest)' },
];

function getSelectArrowImage(isDark: boolean): string {
  const color = isDark ? '%23888888' : '%23666666';
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
}

function getMaskedKeyPreview(apiKey: string): { mask: string; suffix: string } {
  const normalized = apiKey.trim();
  if (normalized.length === 0) {
    return { mask: '', suffix: '' };
  }

  const visibleCount = Math.min(4, normalized.length);
  const suffix = normalized.slice(-visibleCount);
  const hiddenCharactersCount = Math.max(normalized.length - visibleCount, 0);
  const compressedMaskLength = hiddenCharactersCount > 0 ? Math.max(Math.ceil(hiddenCharactersCount / 3), 3) : 0;

  return { mask: '•'.repeat(compressedMaskLength), suffix };
}

export default function AISection() {
  const { mode } = useTheme();
  const isMobile = useIsMobile();
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [savedKeyMask, setSavedKeyMask] = useState('');
  const [savedKeySuffix, setSavedKeySuffix] = useState('');
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [model, setModel] = useState<OpenAIModel>('gpt-5.2');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'invalid' | 'deleted'>('idle');

  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const inputBg = isDark ? '#2a2a2a' : '#e8e8e8';

  useEffect(() => {
    const loadSettings = async () => {
      const savedKey = getApiKey();
      const savedModel = await appStore.get<OpenAIModel>(STORE_KEYS.AI_MODEL);
      if (savedKey && savedKey.trim().length > 0) {
        const normalizedKey = savedKey.trim();
        const preview = getMaskedKeyPreview(normalizedKey);
        setHasSavedApiKey(true);
        setSavedKeyMask(preview.mask);
        setSavedKeySuffix(preview.suffix);
        setIsEditingApiKey(false);
      } else {
        setHasSavedApiKey(false);
        setSavedKeyMask('');
        setSavedKeySuffix('');
        setIsEditingApiKey(true);
      }
      if (savedModel) setModel(savedModel);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (status === 'saved' || status === 'deleted') {
      const timeout = window.setTimeout(() => setStatus('idle'), 2000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [status]);

  const handleReplaceKey = () => {
    setIsEditingApiKey(true);
    setApiKeyValue('');
    setShowKey(false);
    setStatus('idle');
  };

  const handleCancelReplace = () => {
    setIsEditingApiKey(false);
    setApiKeyValue('');
    setShowKey(false);
    setStatus('idle');
  };

  const handleDeleteKey = () => {
    deleteApiKey();
    setHasSavedApiKey(false);
    setSavedKeyMask('');
    setSavedKeySuffix('');
    setApiKeyValue('');
    setShowKey(false);
    setIsEditingApiKey(true);
    setConfirmingDelete(false);
    setStatus('deleted');
  };

  const handleSave = async () => {
    if (isEditingApiKey || !hasSavedApiKey) {
      const candidateKey = apiKeyValue.trim();
      const isValid = /^sk-[a-zA-Z0-9_-]{20,}$/.test(candidateKey);
      if (!isValid) {
        setStatus('invalid');
        return;
      }

      const preview = getMaskedKeyPreview(candidateKey);
      setApiKey(candidateKey);
      setHasSavedApiKey(true);
      setSavedKeyMask(preview.mask);
      setSavedKeySuffix(preview.suffix);
      setApiKeyValue('');
      setShowKey(false);
      setIsEditingApiKey(false);
    }

    setStatus('saving');
    try {
      await appStore.set(STORE_KEYS.AI_MODEL, model);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const shouldShowSave = isEditingApiKey || !hasSavedApiKey;
  const saveDisabled = status === 'saving' || (shouldShowSave && apiKeyValue.trim().length === 0);

  return (
    <div>
      <Text as="h3" variant="primary" className="settings-section__title">
        AI Configuration
      </Text>

      <div className="settings-field">
        <label className="settings-label">OpenAI API Key</label>
        {hasSavedApiKey && !isEditingApiKey ? (
          <>
            <div className="settings-api-key-summary" style={{ backgroundColor: inputBg }}>
              <Text variant="primary" className="settings-api-key-summary__value">
                <span className="settings-api-key-summary__mask">{savedKeyMask}</span><span className="settings-api-key-summary__suffix">{savedKeySuffix}</span>
              </Text>
            </div>
            <div className="settings-button-row">
              <Button variant="secondary" size="sm" onClick={handleReplaceKey} className="settings-button-content">
                Replace Key
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="settings-button-content"
              >
                <IoTrash size={14} /> Delete Key
              </Button>
            </div>
            <p className="settings-hint">
              Stored API keys stay masked. Replace the key if you need to use a different one.
            </p>
          </>
        ) : (
          <>
            <div className="settings-input-container">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                placeholder="sk-..."
                className="settings-input"
                style={{ backgroundColor: inputBg }}
              />
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="settings-toggle-button"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <IoEyeOff size={14} /> : <IoEye size={14} />}
                </button>
              )}
            </div>
            <p className="settings-hint">Get your API key from platform.openai.com</p>
          </>
        )}
      </div>

      {isMobile && (isEditingApiKey || !hasSavedApiKey) && (
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Show API key</span>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={showKey}
              onChange={(event) => setShowKey(event.target.checked)}
            />
            <span className="settings-switch__slider" />
          </label>
        </div>
      )}

      <div className="settings-field settings-advanced">
        <label className="settings-label">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as OpenAIModel)}
          className="settings-select"
          style={{ backgroundColor: inputBg, backgroundImage: getSelectArrowImage(isDark) }}
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="settings-footer">
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={saveDisabled}>
          {status === 'saving' ? 'Saving...' : 'Save'}
        </Button>
        {isEditingApiKey && hasSavedApiKey && (
          <Button variant="ghost" size="sm" onClick={handleCancelReplace}>
            Cancel
          </Button>
        )}
        {status === 'saved' && (
          <span className="settings-status settings-status--success">
            <IoCheckmarkCircle size={14} /> Saved
          </span>
        )}
        {status === 'error' && (
          <span className="settings-status settings-status--error">
            <IoAlertCircle size={14} /> Error saving
          </span>
        )}
        {status === 'invalid' && (
          <span className="settings-status settings-status--error">
            <IoAlertCircle size={14} /> Invalid API key format
          </span>
        )}
        {status === 'deleted' && (
          <span className="settings-status settings-status--success">
            <IoCheckmarkCircle size={14} /> API key deleted
          </span>
        )}
      </div>

      <Modal isOpen={confirmingDelete} onClose={() => setConfirmingDelete(false)} size="sm">
        <div className="settings-modal-content">
          <Text as="h3" variant="primary" className="settings-modal__title">Delete API key?</Text>
          <Text variant="secondary" className="settings-modal__description">
            This removes the saved OpenAI API key from this app. Chat and Insights will be locked until a new key is added.
          </Text>
          <div className="settings-modal__actions">
            <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteKey}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
