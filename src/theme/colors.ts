import { ColorSchemeName } from 'react-native';
import { ThemeMode } from '../domain/types';

export interface ThemePalette {
  isDark: boolean;
  background: string;
  cardBackground: string;
  cardBackgroundSecondary: string;
  cardBorder: string;
  cardBorderHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  gain: string;
  gainLight: string;
  loss: string;
  lossLight: string;
  inputBackground: string;
  inputBorder: string;
  divider: string;
  navBarBackground: string;
  statusBar: 'light-content' | 'dark-content';
  drawerBackground: string;
  drawerBorder: string;
  menuActiveBackground: string;
  menuActiveBorder: string;
  modalOverlay: string;
  modalBackground: string;
  actionTileBackground: string;
  actionTileBorder: string;
  dangerContainer: string;
  dangerText: string;
}

export const darkPalette: ThemePalette = {
  isDark: true,
  background: '#090D16',
  cardBackground: '#131B2D',
  cardBackgroundSecondary: '#151D2F',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardBorderHighlight: 'rgba(56, 189, 248, 0.3)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#38BDF8',
  accentLight: 'rgba(56, 189, 248, 0.12)',
  gain: '#10B981',
  gainLight: 'rgba(16, 185, 129, 0.15)',
  loss: '#EF4444',
  lossLight: 'rgba(239, 68, 68, 0.15)',
  inputBackground: '#0F172A',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  divider: 'rgba(255, 255, 255, 0.06)',
  navBarBackground: '#090D16',
  statusBar: 'light-content',
  drawerBackground: '#0E1626',
  drawerBorder: 'rgba(255, 255, 255, 0.1)',
  menuActiveBackground: 'rgba(56, 189, 248, 0.12)',
  menuActiveBorder: '#38BDF8',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#131B2D',
  actionTileBackground: 'rgba(255, 255, 255, 0.04)',
  actionTileBorder: 'rgba(255, 255, 255, 0.08)',
  dangerContainer: 'rgba(239, 68, 68, 0.15)',
  dangerText: '#EF4444',
};

export const lightPalette: ThemePalette = {
  isDark: false,
  background: '#F1F5F9',
  cardBackground: '#FFFFFF',
  cardBackgroundSecondary: '#F8FAFC',
  cardBorder: '#E2E8F0',
  cardBorderHighlight: 'rgba(2, 132, 199, 0.3)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#0284C7',
  accentLight: 'rgba(2, 132, 199, 0.1)',
  gain: '#059669',
  gainLight: 'rgba(5, 150, 105, 0.12)',
  loss: '#DC2626',
  lossLight: 'rgba(220, 38, 38, 0.12)',
  inputBackground: '#F8FAFC',
  inputBorder: '#CBD5E1',
  divider: '#E2E8F0',
  navBarBackground: '#FFFFFF',
  statusBar: 'dark-content',
  drawerBackground: '#FFFFFF',
  drawerBorder: '#E2E8F0',
  menuActiveBackground: 'rgba(2, 132, 199, 0.08)',
  menuActiveBorder: '#0284C7',
  modalOverlay: 'rgba(15, 23, 42, 0.5)',
  modalBackground: '#FFFFFF',
  actionTileBackground: '#F8FAFC',
  actionTileBorder: '#E2E8F0',
  dangerContainer: 'rgba(220, 38, 38, 0.1)',
  dangerText: '#DC2626',
};

/**
 * 根据配置和系统色彩解析实际生效的主题模式 ('dark' | 'light')
 */
export function resolveEffectiveTheme(
  mode: ThemeMode,
  systemScheme?: ColorSchemeName
): 'dark' | 'light' {
  if (mode === 'system') {
    return systemScheme === 'light' ? 'light' : 'dark';
  }
  return mode;
}

/**
 * 获取当前对应的调色板
 */
export function getThemePalette(
  mode: ThemeMode,
  systemScheme?: ColorSchemeName
): ThemePalette {
  const effective = resolveEffectiveTheme(mode, systemScheme);
  return effective === 'light' ? lightPalette : darkPalette;
}
