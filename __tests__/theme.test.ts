import {
  resolveEffectiveTheme,
  getThemePalette,
  darkPalette,
  lightPalette,
} from '../src/theme/colors';
import { DEFAULT_USER_SETTINGS } from '../src/database/repositories/settingsRepository';

describe('Theme System', () => {
  test('default user settings theme is "dark"', () => {
    expect(DEFAULT_USER_SETTINGS.theme).toBe('dark');
  });

  describe('resolveEffectiveTheme', () => {
    test('resolves explicit dark theme mode', () => {
      expect(resolveEffectiveTheme('dark', 'light')).toBe('dark');
      expect(resolveEffectiveTheme('dark', 'dark')).toBe('dark');
      expect(resolveEffectiveTheme('dark', null)).toBe('dark');
    });

    test('resolves explicit light theme mode', () => {
      expect(resolveEffectiveTheme('light', 'dark')).toBe('light');
      expect(resolveEffectiveTheme('light', 'light')).toBe('light');
      expect(resolveEffectiveTheme('light', null)).toBe('light');
    });

    test('resolves system theme mode following system appearance', () => {
      expect(resolveEffectiveTheme('system', 'light')).toBe('light');
      expect(resolveEffectiveTheme('system', 'dark')).toBe('dark');
      // When system scheme is undefined or null, defaults to dark
      expect(resolveEffectiveTheme('system', null)).toBe('dark');
      expect(resolveEffectiveTheme('system', undefined)).toBe('dark');
    });
  });

  describe('getThemePalette', () => {
    test('returns darkPalette when effective theme is dark', () => {
      const palette = getThemePalette('dark');
      expect(palette.isDark).toBe(true);
      expect(palette.background).toBe(darkPalette.background);
      expect(palette.statusBar).toBe('light-content');
    });

    test('returns lightPalette when effective theme is light', () => {
      const palette = getThemePalette('light');
      expect(palette.isDark).toBe(false);
      expect(palette.background).toBe(lightPalette.background);
      expect(palette.statusBar).toBe('dark-content');
    });

    test('returns appropriate palette when mode is system', () => {
      const lightSysPalette = getThemePalette('system', 'light');
      expect(lightSysPalette.isDark).toBe(false);
      expect(lightSysPalette.background).toBe(lightPalette.background);

      const darkSysPalette = getThemePalette('system', 'dark');
      expect(darkSysPalette.isDark).toBe(true);
      expect(darkSysPalette.background).toBe(darkPalette.background);
    });

    test('both palettes have all required color token keys', () => {
      const darkKeys = Object.keys(darkPalette).sort();
      const lightKeys = Object.keys(lightPalette).sort();
      expect(darkKeys).toEqual(lightKeys);
    });
  });
});
