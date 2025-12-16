export interface ThemeTokens {
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
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
      primary: '#f6f6f6',
      secondary: '#ffffff',
      tertiary: '#f0f0f0',
    },
    text: {
      primary: '#0f0f0f',
      secondary: '#333333',
      accent: '#646cff',
    },
    border: {
      primary: '#e0e0e0',
      secondary: '#e8e8e8',
    },
    interactive: {
      default: '#ffffff',
      hover: '#396cd8',
      active: '#e8e8e8',
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
      primary: '#2f2f2f',
      secondary: '#1a1a1a',
      tertiary: '#0f0f0f98',
    },
    text: {
      primary: '#f6f6f6',
      secondary: '#f6f6f6',
      accent: '#24c8db',
    },
    border: {
      primary: '#333333',
      secondary: '#2a2a2a',
    },
    interactive: {
      default: '#0f0f0f98',
      hover: '#535bf2',
      active: '#0f0f0f69',
    },
  },
  spacing: lightTheme.spacing,
  typography: lightTheme.typography,
};

export type ThemeMode = 'light' | 'dark';
