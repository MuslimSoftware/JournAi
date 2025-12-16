import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-primary)',
        backgroundColor: 'var(--interactive-default)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontWeight: 500,
      }}
    >
      {mode === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
