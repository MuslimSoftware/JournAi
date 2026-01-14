import { useTheme } from '../../contexts/ThemeContext';
import { ThemeMode, lightTheme, darkTheme } from '../../theme/tokens';
import { IoSunnyOutline, IoMoonOutline, IoLaptopOutline } from 'react-icons/io5';
import ThemeOption from '../themed/ThemeOption';
import Text from '../themed/Text';
import '../../styles/settings.css';

export default function PersonalizationSection() {
  const { mode, setTheme } = useTheme();

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

  return (
    <div>
      <div className="settings-section">
        <Text as="h3" variant="primary" className="settings-section-header">
          Theme
        </Text>
        <div className="settings-theme-cards">
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
