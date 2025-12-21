import { CSSProperties } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import { Container, Text } from '../components/themed';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Projections() {
  const isMobile = useIsMobile();
  const { openSettings } = useSettings();
  const { theme } = useTheme();

  if (isMobile) {
    const headerStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      minHeight: '56px',
    };

    const iconButtonStyle: CSSProperties = {
      background: 'none',
      border: 'none',
      padding: '8px',
      color: theme.colors.text.muted,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    return (
      <div style={{ height: '100%', backgroundColor: theme.colors.background.primary }}>
        <header style={headerStyle}>
          <Text style={{ fontSize: '1.5rem', fontWeight: 700 }}>Trends</Text>
          <button onClick={openSettings} style={iconButtonStyle} aria-label="Settings">
            <IoSettingsOutline size={22} />
          </button>
        </header>
        <Container variant="primary" padding="md">
          <Text as="p" variant="secondary">Projections page content goes here.</Text>
        </Container>
      </div>
    );
  }

  return (
    <Container variant="primary" padding="lg">
      <Text as="h1" variant="primary">Projections</Text>
      <Text as="p" variant="secondary">Projections page content goes here.</Text>
    </Container>
  );
}
