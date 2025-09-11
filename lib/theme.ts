export type Theme = {
  color: {
    brand: {
      50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string;
    };
    accent: { 50: string; 100: string; 500: string; 600: string };
    success: { 50: string; 500: string; 600: string };
    warning: { 50: string; 500: string; 600: string };
    danger: { 50: string; 500: string; 600: string };
    neutral: {
      0: string; 25: string; 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
    };
    overlay: string;
  };
  surface: {
    background: string;
    container: string;
    elevated: string;
    border: string;
  };
  text: { primary: string; secondary: string; muted: string; inverted: string };
  radius: { xs: number; sm: number; md: number; lg: number; xl: number; full: number };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
  elevation: { 0: string; 1: string; 2: string; 3: string; 4: string };
  typography: {
    fontFamily: string;
    headings: { h1: number; h2: number; h3: number; h4: number };
    body: { sm: number; md: number; lg: number };
    caption: number;
    lineHeights: { tight: number; normal: number; relaxed: number };
  };
};

// Decision Section 0 mapping
// Brand: #2B2E78, Accent secondary: #FAFBFF, Neutrals: light/warm, Radius: md, Density: standard,
// Buttons: mixed + rounded, Header: blur + small, Lists/Cards: no separators, Dark mode: adapted, Animations: light

export const themeLight: Theme = {
  color: {
    brand: {
      50: '#EEF0FA',
      100: '#D9DCF2',
      200: '#B4BAE5',
      300: '#8F98D7',
      400: '#6A76CA',
      500: '#4755BD',
      600: '#2B2E78', // primary brand
      700: '#23255F',
      800: '#1B1D49',
      900: '#141636',
    },
    accent: { 50: '#FAFBFF', 100: '#F5F7FD', 500: '#9AAAF4', 600: '#7E93EE' },
    success: { 50: '#EAF8F0', 500: '#22C55E', 600: '#16A34A' },
    warning: { 50: '#FFF7E6', 500: '#F59E0B', 600: '#D97706' },
    danger: { 50: '#FEECEE', 500: '#EF4444', 600: '#DC2626' },
    neutral: {
      0: '#FFFFFF', 25: '#FCFBFA', 50: '#FAF9F7', 100: '#F5F2EE', 200: '#E9E4DE', 300: '#D9D1C9', 400: '#BDB3A9', 500: '#A29688', 600: '#7E7468', 700: '#5F584F', 800: '#3F3A35', 900: '#26231F', 950: '#171512',
    },
    overlay: 'rgba(0,0,0,0.25)'
  },
  surface: {
    background: '#FAF9F7',
    container: '#FFFFFF',
    elevated: '#FFFFFF',
    border: 'rgba(24, 24, 27, 0.08)',
  },
  text: {
    primary: '#1F2937',
    secondary: '#374151',
    muted: '#6B7280',
    inverted: '#FFFFFF',
  },
  radius: { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  elevation: {
    0: 'rgba(0,0,0,0.00) 0px 0px 0px',
    1: 'rgba(0,0,0,0.06) 0px 1px 3px',
    2: 'rgba(0,0,0,0.08) 0px 3px 6px',
    3: 'rgba(0,0,0,0.10) 0px 6px 12px',
    4: 'rgba(0,0,0,0.12) 0px 10px 20px',
  },
  typography: {
    fontFamily: 'System',
    headings: { h1: 32, h2: 24, h3: 20, h4: 18 },
    body: { sm: 12, md: 14, lg: 16 },
    caption: 12,
    lineHeights: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
  },
};

export const themeDark: Theme = {
  ...themeLight,
  surface: {
    background: '#0F1115',
    container: '#161A21',
    elevated: '#1B2028',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  text: {
    primary: '#E5E7EB',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
    inverted: '#0B0B0B',
  },
  color: {
    ...themeLight.color,
    overlay: 'rgba(0,0,0,0.5)'
  }
};

