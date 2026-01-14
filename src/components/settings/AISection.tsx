import { useState, useEffect } from 'react';
import { IoEye, IoEyeOff, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Button } from '../themed';
import { appStore, STORE_KEYS } from '../../lib/store';
import { getApiKey, setApiKey } from '../../lib/secureStorage';
import type { OpenAIModel } from '../../types/chat';
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

export default function AISection() {
  const { mode } = useTheme();
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [model, setModel] = useState<OpenAIModel>('gpt-5.2');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'invalid'>('idle');

  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const inputBg = isDark ? '#2a2a2a' : '#e8e8e8';

  useEffect(() => {
    const loadSettings = async () => {
      const savedKey = getApiKey();
      const savedModel = await appStore.get<OpenAIModel>(STORE_KEYS.AI_MODEL);
      if (savedKey) setApiKeyValue(savedKey);
      if (savedModel) setModel(savedModel);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    const isValid = /^sk-[a-zA-Z0-9_-]{20,}$/.test(apiKeyValue);
    if (!isValid) {
      setStatus('invalid');
      return;
    }
    setStatus('saving');
    try {
      setApiKey(apiKeyValue);
      await appStore.set(STORE_KEYS.AI_MODEL, model);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      <Text as="h3" variant="primary" className="settings-section__title">
        AI Configuration
      </Text>

      <div className="settings-field">
        <label className="settings-label">OpenAI API Key</label>
        <div className="settings-input-container">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKeyValue}
            onChange={(e) => setApiKeyValue(e.target.value)}
            placeholder="sk-..."
            className="settings-input"
            style={{ backgroundColor: inputBg }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="settings-toggle-button"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <IoEyeOff size={14} /> : <IoEye size={14} />}
          </button>
        </div>
        <p className="settings-hint">Get your API key from platform.openai.com</p>
      </div>

      <div className="settings-field">
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
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={!apiKeyValue || status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Save'}
        </Button>
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
      </div>
    </div>
  );
}
