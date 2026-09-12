import React, { useEffect, useRef } from 'react';
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
import { CurrencyType } from '../../domain/types';
import { CURRENCY_CONFIGS, getNextCurrency } from '../../domain/currency';
import {
  HomeIcon,
  SettingsGearIcon,
  UserAvatarIcon,
  CloseCrossIcon,
} from '../common/Icons';

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
}) => {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

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
        <TouchableOpacity style={styles.floatingCloseBtn} onPress={onClose} activeOpacity={0.7}>
          <CloseCrossIcon size={16} color="#F8FAFC" />
        </TouchableOpacity>
      </Animated.View>

      {/* 侧边栏主体 */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.topSection}>
          {/* 顶部个人名片 */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <UserAvatarIcon size={24} color="#94A3B8" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Rick H.</Text>
              <Text style={styles.userEmail}>rick@example.com</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Crypto Track Pro</Text>
              </View>
            </View>
          </View>

          {/* 导航条目 (主页项具有设计图同款发光边框) */}
          <View style={styles.menuList}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                activeScreen === 'home' && styles.menuItemActive,
              ]}
              onPress={() => {
                onNavigateHome?.();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <HomeIcon size={20} color={activeScreen === 'home' ? '#38BDF8' : '#94A3B8'} />
              <Text
                style={[
                  styles.menuTitle,
                  activeScreen === 'home' && styles.menuTitleActive,
                ]}
              >
                Portfolio Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                activeScreen === 'settings' && styles.menuItemActive,
              ]}
              onPress={() => {
                onNavigateSettings?.();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <SettingsGearIcon size={20} color={activeScreen === 'settings' ? '#38BDF8' : '#94A3B8'} />
              <Text
                style={[
                  styles.menuTitle,
                  activeScreen === 'settings' && styles.menuTitleActive,
                ]}
              >
                Settings & Profile
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
            <Text style={styles.prefLabel}>Base Currency:</Text>
            <Text style={styles.currencyValueText}>
              {CURRENCY_CONFIGS[currency]?.name || currency} ⇄
            </Text>
          </TouchableOpacity>

          {/* 防偷窥隐私模式快捷开关 */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={onTogglePrivacy}
            activeOpacity={0.7}
          >
            <Text style={styles.prefLabel}>Privacy Mode:</Text>
            <Text style={privacyMode ? styles.secActiveText : styles.secDisabledText}>
              {privacyMode ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>

          {/* 生物识别安全锁状态 */}
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Biometric Lock (Face ID):</Text>
            <Text style={styles.secDisabledText}>Planned</Text>
          </View>

          {/* 版本号 */}
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>v1.0.0</Text>
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
    gap: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  avatarText: {
    fontSize: 20,
  },
  userInfo: {
    gap: 2,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  userEmail: {
    color: '#8E9BAE',
    fontSize: 12,
    marginBottom: 2,
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
