import { useTheme } from '../../contexts/ThemeContext';
import { ThemeMode, lightTheme, darkTheme } from '../../theme/tokens';
import { IoSunnyOutline, IoMoonOutline, IoLaptopOutline } from 'react-icons/io5';
import ThemeOption from '../themed/ThemeOption';
import Text from '../themed/Text';
import { CSSProperties } from 'react';

export default function PersonalizationSection() {
  const { theme, mode, setTheme } = useTheme();

  const getSystemThemeColors = () => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode
      ? { background: darkTheme.colors.background.secondary, text: darkTheme.colors.text.primary }
      : { background: lightTheme.colors.background.secondary, text: lightTheme.colors.text.primary };
  };

  const themeOptions = [
    {
      value: 'light' as ThemeMode,
      label: 'Light',
      icon: <IoSunnyOutline />,
      previewColors: {
        background: lightTheme.colors.background.secondary,
        text: lightTheme.colors.text.primary,
      },
    },
    {
      value: 'dark' as ThemeMode,
      label: 'Dark',
      icon: <IoMoonOutline />,
      previewColors: {
        background: darkTheme.colors.background.secondary,
        text: darkTheme.colors.text.primary,
      },
    },
    {
      value: 'system' as ThemeMode,
      label: 'System',
      icon: <IoLaptopOutline />,
      previewColors: getSystemThemeColors(),
    },
  ];

  const sectionStyle: CSSProperties = {
    marginBottom: theme.spacing.xl,
  };

  const headerStyle: CSSProperties = {
    marginBottom: theme.spacing.md,
  };

  const cardsContainerStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  };

  return (
    <div>
      <div style={sectionStyle}>
        <Text as="h3" variant="primary" style={headerStyle}>
          Theme
        </Text>
        <div style={cardsContainerStyle}>
          {themeOptions.map((option) => (
            <ThemeOption
              key={option.value}
              label={option.label}
              icon={option.icon}
              isSelected={mode === option.value}
              onClick={() => setTheme(option.value)}
              previewColors={option.previewColors}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
