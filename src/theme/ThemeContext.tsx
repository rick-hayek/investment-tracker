import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode } from '../domain/types';
import {
  ThemePalette,
  darkPalette,
  lightPalette,
  resolveEffectiveTheme,
  getThemePalette,
} from './colors';

export interface ThemeContextValue {
  themeMode: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  colors: ThemePalette;
  isDark: boolean;
  setThemeMode?: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  effectiveTheme: 'dark',
  colors: darkPalette,
  isDark: true,
});

export interface ThemeProviderProps {
  themeMode: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  themeMode,
  onThemeChange,
  children,
}) => {
  const systemScheme = useColorScheme();

  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme(themeMode, systemScheme),
    [themeMode, systemScheme]
  );

  const colors = useMemo(
    () => (effectiveTheme === 'light' ? lightPalette : darkPalette),
    [effectiveTheme]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      effectiveTheme,
      colors,
      isDark: effectiveTheme === 'dark',
      setThemeMode: onThemeChange,
    }),
    [themeMode, effectiveTheme, colors, onThemeChange]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
