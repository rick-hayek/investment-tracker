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
          duration: 250,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayAnim]);

  // 左滑收起手势
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -15 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          onClose();
        }
      },
    })
  ).current;

  if (!isOpen && (slideAnim as any)._value === -DRAWER_WIDTH) {
    return null;
  }

  const handleCycleCurrency = () => {
    const next = getNextCurrency(currency);
    onCurrencyChange(next);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* 半透明遮罩 */}
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
              <Text style={styles.avatarText}>👨‍💻</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Rick H.</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Crypto Track Pro</Text>
              </View>
            </View>
          </View>

          {/* 导航条目 */}
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
              <Text style={styles.menuIcon}>🏠</Text>
              <Text
                style={[
                  styles.menuTitle,
                  activeScreen === 'home' && styles.menuTitleActive,
                ]}
              >
                资产看板 (Portfolio Home)
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
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text
                style={[
                  styles.menuTitle,
                  activeScreen === 'settings' && styles.menuTitleActive,
                ]}
              >
                设置与个人 (Settings & Profile)
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
            <Text style={styles.prefLabel}>基准法币 (Currency)</Text>
            <View style={styles.currencyPill}>
              <Text style={styles.currencyPillText}>
                {CURRENCY_CONFIGS[currency]?.name || currency} ⇄
              </Text>
            </View>
          </TouchableOpacity>

          {/* 防偷窥隐私模式快捷开关 */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={onTogglePrivacy}
            activeOpacity={0.7}
          >
            <Text style={styles.prefLabel}>防偷窥隐私模式</Text>
            <Text style={privacyMode ? styles.secActiveText : styles.secDisabledText}>
              {privacyMode ? '● 已开启 🙈' : '未开启 👁️'}
            </Text>
          </TouchableOpacity>

          {/* 生物识别安全锁状态 */}
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Face ID / 指纹安全锁</Text>
            <Text style={styles.secDisabledText}>
              规划中
            </Text>
          </View>

          {/* 版本号 */}
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Investment Tracker</Text>
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
  },
  menuItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  menuTitleActive: {
    color: '#60A5FA',
    fontWeight: '700',
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
