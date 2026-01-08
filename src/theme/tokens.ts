export interface ThemeTokens {
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      subtle: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      emphasis: string;
      accent: string;
    };
    border: {
      primary: string;
      secondary: string;
    };
    interactive: {
      default: string;
      hover: string;
      active: string;
    };
    indicator: {
      entry: string;
      stickyNote: string;
      todoComplete: string;
      todoPending: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
      h5: string;
      h6: string;
      p: string;
      span: string;
    };
    fontWeight: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
      p: number;
      span: number;
    };
    lineHeight: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
      h5: string;
      h6: string;
      p: string;
      span: string;
    };
  };
}

export const lightTheme: ThemeTokens = {
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#fafafa',
      subtle: 'rgba(0, 0, 0, 0.04)',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#424242',
      muted: '#757575',
      emphasis: '#1a1a1a',
      accent: '#f59e0b',
    },
    border: {
      primary: '#e0e0e0',
      secondary: '#eeeeee',
    },
    interactive: {
      default: '#ffffff',
      hover: '#1a1a1a',
      active: '#f0f0f0',
    },
    indicator: {
      entry: '#f59e0b',
      stickyNote: '#8b5cf6',
      todoComplete: '#757575',
      todoPending: '#424242',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: 'Inter, Avenir, Helvetica, Arial, sans-serif',
    fontSize: {
      h1: '2em',
      h2: '1.5em',
      h3: '1.25em',
      h4: '1.1em',
      h5: '1em',
      h6: '0.875em',
      p: '1em',
      span: '1em',
    },
    fontWeight: {
      h1: 600,
      h2: 600,
      h3: 600,
      h4: 600,
      h5: 600,
      h6: 600,
      p: 400,
      span: 400,
    },
    lineHeight: {
      h1: '1.2',
      h2: '1.3',
      h3: '1.4',
      h4: '1.4',
      h5: '1.5',
      h6: '1.5',
      p: '1.5',
      span: '1.5',
    },
  },
};

export const darkTheme: ThemeTokens = {
  colors: {
    background: {
      primary: '#121212',
      secondary: '#1e1e1e',
      tertiary: '#181818',
      subtle: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#b0b0b0',
      muted: '#757575',
      emphasis: '#ffffff',
      accent: '#fbbf24',
    },
    border: {
      primary: '#2e2e2e',
      secondary: '#252525',
    },
    interactive: {
      default: '#1e1e1e',
      hover: '#e0e0e0',
      active: '#2a2a2a',
    },
    indicator: {
      entry: '#fbbf24',
      stickyNote: '#a78bfa',
      todoComplete: '#757575',
      todoPending: '#b0b0b0',
    },
  },
  spacing: lightTheme.spacing,
  typography: lightTheme.typography,
};

export type ThemeMode = 'light' | 'dark' | 'system';
