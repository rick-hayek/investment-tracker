import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { CurrencyType, CloudUserInfo, ThemeMode } from '../../domain/types';
import { CURRENCY_CONFIGS, getNextCurrency } from '../../domain/currency';
import { LanguageType, t, getLanguageName } from '../../i18n';
import {
  HomeIcon,
  SettingsGearIcon,
  CloseCrossIcon,
  AppLogoIcon,
} from '../common/Icons';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 300);

export interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen?: 'home' | 'settings';
  onNavigateHome?: () => void;
  onNavigateSettings?: () => void;
  currency: CurrencyType;
  onCurrencyChange: (next: CurrencyType) => void;
  privacyMode?: boolean;
  onTogglePrivacy?: () => void;
  biometricEnabled?: boolean;
  language?: LanguageType;
  onLanguageChange?: (next: LanguageType) => void;
  themeMode?: ThemeMode;
  onThemeChange?: (next: ThemeMode) => void;
  onPressLogin?: () => void;
  cloudUser?: CloudUserInfo | null;
}

export const AppDrawer: React.FC<AppDrawerProps> = ({
  isOpen,
  onClose,
  activeScreen = 'home',
  onNavigateHome,
  onNavigateSettings,
  currency,
  onCurrencyChange,
  privacyMode = false,
  onTogglePrivacy,
  biometricEnabled = false,
  language = 'zh',
  onLanguageChange,
  themeMode,
  onThemeChange,
  onPressLogin,
  cloudUser,
}) => {
  const { colors, isDark, themeMode: contextThemeMode, setThemeMode } = useTheme();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const currentThemeMode: ThemeMode = themeMode ?? contextThemeMode ?? 'dark';

  const handleCycleTheme = () => {
    const next: ThemeMode =
      currentThemeMode === 'dark' ? 'light' : currentThemeMode === 'light' ? 'system' : 'dark';
    if (onThemeChange) {
      onThemeChange(next);
    } else if (setThemeMode) {
      setThemeMode(next);
    }
  };

  const themeLabel = useMemo(() => {
    switch (currentThemeMode) {
      case 'system':
        return t('settings.themeSystem', language);
      case 'light':
        return t('settings.themeLight', language);
      case 'dark':
      default:
        return t('settings.themeDark', language);
    }
  }, [currentThemeMode, language]);

  // 动画控制：280ms 贝塞尔曲线
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 240,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayAnim]);

  // 手势拖拽侦听器
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          slideAnim.setValue(Math.max(-DRAWER_WIDTH, gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -DRAWER_WIDTH * 0.35 || gestureState.vx < -0.5) {
          onClose();
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleCycleCurrency = () => {
    onCurrencyChange(getNextCurrency(currency));
  };

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* 灰色半透明遮罩背景 */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* 浮动圆形关闭按钮 (100% 还原 04_sidebar_drawer.jpg) */}
      <Animated.View
        style={[
          styles.closeBtnWrapper,
          {
            left: DRAWER_WIDTH + 14,
            opacity: overlayAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.floatingCloseBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <CloseCrossIcon size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </Animated.View>

      {/* 侧边栏主体 */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            backgroundColor: colors.drawerBackground,
            borderRightColor: colors.drawerBorder,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.topSection}>
          {/* Brand Header: SVG Line Logo + App Name */}
          <View style={styles.brandContainer}>
            <View style={styles.brandHeader}>
              <AppLogoIcon size={20} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                Investment Tracker
              </Text>
            </View>

            {/* 分隔线 */}
            <View style={[styles.brandDivider, { backgroundColor: colors.divider }]} />
          </View>

          {/* 导航条目 (主页项具有设计图同款发光边框) */}
          <View style={styles.menuList}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                activeScreen === 'home' && [
                  styles.menuItemActive,
                  { backgroundColor: colors.menuActiveBackground, borderColor: colors.menuActiveBorder },
                ],
              ]}
              onPress={() => {
                onNavigateHome?.();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <HomeIcon size={20} color={activeScreen === 'home' ? colors.accent : colors.textSecondary} />
              <Text
                style={[
                  styles.menuTitle,
                  { color: colors.textSecondary },
                  activeScreen === 'home' && [styles.menuTitleActive, { color: colors.accent }],
                ]}
              >
                {t('drawer.portfolioHome', language)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                activeScreen === 'settings' && [
                  styles.menuItemActive,
                  { backgroundColor: colors.menuActiveBackground, borderColor: colors.menuActiveBorder },
                ],
              ]}
              onPress={() => {
                onNavigateSettings?.();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <SettingsGearIcon size={20} color={activeScreen === 'settings' ? colors.accent : colors.textSecondary} />
              <Text
                style={[
                  styles.menuTitle,
                  { color: colors.textSecondary },
                  activeScreen === 'settings' && [styles.menuTitleActive, { color: colors.accent }],
                ]}
              >
                {t('drawer.settingsAndProfile', language)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 底部快捷偏好区 */}
        <View style={styles.footerSection}>
          {/* 基准法币切换 */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={handleCycleCurrency}
            activeOpacity={0.7}
          >
            <Text style={[styles.prefLabel, { color: colors.textSecondary }]}>{t('drawer.baseCurrencyLabel', language)}:</Text>
            <Text style={[styles.currencyValueText, { color: colors.accent }]}>
              {CURRENCY_CONFIGS[currency]?.name || currency} ⇄
            </Text>
          </TouchableOpacity>

          {/* 语言切换 */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={() => {
              const next = language === 'zh' ? 'en' : 'zh';
              onLanguageChange?.(next);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.prefLabel, { color: colors.textSecondary }]}>{t('settings.language', language)}:</Text>
            <Text style={[styles.currencyValueText, { color: colors.accent }]}>
              {getLanguageName(language)} ⇄
            </Text>
          </TouchableOpacity>

          {/* 外观主题切换 (Dark -> Light -> System -> Dark) */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={handleCycleTheme}
            activeOpacity={0.7}
          >
            <Text style={[styles.prefLabel, { color: colors.textSecondary }]}>{t('settings.theme', language)}:</Text>
            <Text style={[styles.currencyValueText, { color: colors.accent }]}>
              {themeLabel} ⇄
            </Text>
          </TouchableOpacity>

          {/* 防偷窥隐私模式快捷开关 */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={onTogglePrivacy}
            activeOpacity={0.7}
          >
            <Text style={[styles.prefLabel, { color: colors.textSecondary }]}>{t('drawer.privacyModeLabel', language)}:</Text>
            <Text style={privacyMode ? [styles.secActiveText, { color: colors.gain }] : [styles.secDisabledText, { color: colors.textMuted }]}>
              {privacyMode ? t('common.on', language) : t('common.off', language)}
            </Text>
          </TouchableOpacity>

          {/* 生物识别安全锁状态 */}
          <View style={styles.prefRow}>
            <Text style={[styles.prefLabel, { color: colors.textSecondary }]}>{t('drawer.biometricLockLabel', language)}:</Text>
            <Text style={[styles.secDisabledText, { color: colors.textMuted }]}>{t('drawer.planned', language)}</Text>
          </View>

          {/* 版本号 */}
          <View style={styles.versionRow}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>{t('drawer.version', language)}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0E1626',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 28,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 20,
  },
  topSection: {
    gap: 16,
  },
  brandContainer: {
    gap: 14,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  brandTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 8,
  },
  closeBtnWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    zIndex: 999,
  },
  floatingCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  menuTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  menuTitleActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  currencyValueText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
    gap: 12,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prefLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  currencyPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  currencyPillText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  secActiveText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  secDisabledText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  versionText: {
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: 11,
  },
});
