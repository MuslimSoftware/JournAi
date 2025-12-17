import { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
}

export default function RadioGroup({ options, value, onChange, name }: RadioGroupProps) {
  const { theme } = useTheme();

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  };

  const optionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.border.primary}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const selectedStyle: CSSProperties = {
    ...optionStyle,
    borderColor: theme.colors.text.accent,
    backgroundColor: theme.colors.background.subtle,
  };

  return (
    <div style={containerStyle}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            style={isSelected ? selectedStyle : optionStyle}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              style={{ marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                  color: theme.colors.text.primary,
                  marginBottom: option.description ? theme.spacing.xs : 0,
                }}
              >
                {option.label}
              </div>
              {option.description && (
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: theme.colors.text.muted,
                  }}
                >
                  {option.description}
                </div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
