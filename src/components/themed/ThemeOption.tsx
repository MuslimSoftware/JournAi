import { ReactNode } from 'react';
import '../../styles/themed.css';

interface ThemeOptionProps {
  label: string;
  icon: ReactNode;
  isSelected: boolean;
  onClick: () => void;
  previewColors: {
    background: string;
    text: string;
  };
}

export default function ThemeOption({
  label,
  icon,
  isSelected,
  onClick,
  previewColors,
}: ThemeOptionProps) {
  const optionClass = `theme-option${isSelected ? ' theme-option--selected' : ''}`;

  return (
    <div className={optionClass} onClick={onClick}>
      <div className="theme-option__icon">{icon}</div>
      <div className="theme-option__preview" style={{ backgroundColor: previewColors.background }}>
        <span className="theme-option__preview-text" style={{ color: previewColors.text }}>Aa</span>
      </div>
      <div className="theme-option__label">{label}</div>
    </div>
  );
}
