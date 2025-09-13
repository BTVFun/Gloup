export type Theme = {
  color: {
    brand: {
      50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
    };
    accent: { 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string };
    success: { 50: string; 500: string; 600: string };
    warning: { 50: string; 500: string; 600: string };
    danger: { 50: string; 500: string; 600: string };
    info: { 50: string; 500: string; 600: string };
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
    glass: string;
  };
  text: { primary: string; secondary: string; muted: string; inverted: string };
  radius: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number; full: number };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
  elevation: { 
    0: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    1: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    2: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    3: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    4: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  };
  typography: {
    fontFamily: string;
    headings: { h1: number; h2: number; h3: number; h4: number };
    body: { sm: number; md: number; lg: number };
    caption: number;
    lineHeights: { tight: number; normal: number; relaxed: number };
    weights: { light: string; normal: string; medium: string; semibold: string; bold: string };
  };
  animations: {
    timing: { fast: number; normal: number; slow: number };
    easing: { ease: string; easeIn: string; easeOut: string; easeInOut: string };
    spring: { damping: number; stiffness: number; mass: number };
  };
};

// Decision Section 0 mapping
// Brand: #2B2E78, Accent secondary: #FAFBFF, Neutrals: light/warm, Radius: md, Density: standard,
// Buttons: mixed + rounded, Header: blur + small, Lists/Cards: no separators, Dark mode: adapted, Animations: light

export const themeLight: Theme = {
  color: {
    brand: {
      50: '#F8F9FF',
      100: '#EBEEFF',
      200: '#D6DDFF',
      300: '#B8C5FF',
      400: '#95A3FF',
      500: '#7B8CFF',
      600: '#2B2E78', // primary brand
      700: '#252968',
      800: '#1E2258',
      900: '#181B48',
      950: '#0F1129',
    },
    accent: { 
      50: '#FAFBFF', 
      100: '#F5F7FD', 
      200: '#E8ECFA',
      300: '#D1D9F5',
      400: '#A8B8ED',
      500: '#7B8CFF', 
      600: '#6978EB',
      700: '#5A5FDB',
      800: '#4C52C7',
      900: '#3D42A3'
    },
    success: { 50: '#F0FDF4', 500: '#22C55E', 600: '#16A34A' },
    warning: { 50: '#FFFBEB', 500: '#F59E0B', 600: '#D97706' },
    danger: { 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' },
    info: { 50: '#EFF6FF', 500: '#3B82F6', 600: '#2563EB' },
    neutral: {
      0: '#FFFFFF', 25: '#FDFCFB', 50: '#FAF9F7', 100: '#F7F5F3', 200: '#F0EDE9', 300: '#E6E1DB', 400: '#D1C7B8', 500: '#B8A898', 600: '#9C8A78', 700: '#7D6B5A', 800: '#5D4E42', 900: '#3D342C', 950: '#2A221C',
    },
    overlay: 'rgba(43, 46, 120, 0.25)'
  },
  surface: {
    background: '#FAFBFF', // Updated to match accent secondary from design
    container: '#FFFFFF',
    elevated: '#F8F9FF',
    border: 'rgba(43, 46, 120, 0.08)', // Using brand color for borders
    glass: 'rgba(255, 255, 255, 0.8)',
  },
  text: {
    primary: '#2A221C',
    secondary: '#5D4E42',
    muted: '#9C8A78',
    inverted: '#FFFFFF',
  },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  elevation: {
    0: { shadowColor: '#2B2E78', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    1: { shadowColor: '#2B2E78', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    2: { shadowColor: '#2B2E78', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
    3: { shadowColor: '#2B2E78', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8 },
    4: { shadowColor: '#2B2E78', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.20, shadowRadius: 24, elevation: 12 },
  },
  typography: {
    fontFamily: 'Inter, SF Pro Display, system-ui, -apple-system, sans-serif',
    headings: { h1: 32, h2: 24, h3: 20, h4: 18 },
    body: { sm: 12, md: 14, lg: 16 },
    caption: 12,
    lineHeights: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
    weights: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' },
  },
  animations: {
    timing: { fast: 150, normal: 300, slow: 500 },
    easing: { ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out' },
    spring: { damping: 15, stiffness: 300, mass: 1 },
  },
};

export const themeDark: Theme = {
  ...themeLight,
  surface: {
    background: '#0A0B1E',        // Deep navy, not black
    container: '#141629',         // Slightly lighter for cards
    elevated: '#1C1F3B',          // For elevated surfaces
    border: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(20, 22, 41, 0.8)',
  },
  text: {
    primary: '#FAFBFF',       // Soft white
    secondary: '#B8BAD9',     // Muted purple-gray
    muted: '#7E819F',         // Subtle text
    inverted: '#0A0B1E',
  },
  color: {
    ...themeLight.color,
    overlay: 'rgba(0,0,0,0.5)',
    brand: {
      ...themeLight.color.brand,
      500: '#5A5FDB',           // Brighter purple for visibility
      600: '#5A5FDB',           // Adjusted for dark mode
    },
  },
  elevation: {
    0: { shadowColor: '#5A5FDB', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    1: { shadowColor: '#5A5FDB', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 0 },
    2: { shadowColor: '#5A5FDB', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 0 },
    3: { shadowColor: '#5A5FDB', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 0 },
    4: { shadowColor: '#5A5FDB', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 0 },
  },
};

