import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { themeDark, themeLight, type Theme } from './theme';

type ThemeContextValue = { theme: Theme; scheme: 'light' | 'dark' };

const ThemeContext = createContext<ThemeContextValue>({ theme: themeLight, scheme: 'light' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = (useColorScheme?.() ?? 'light') as 'light' | 'dark';
  const theme = useMemo(() => (scheme === 'dark' ? themeDark : themeLight), [scheme]);
  return <ThemeContext.Provider value={{ theme, scheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

