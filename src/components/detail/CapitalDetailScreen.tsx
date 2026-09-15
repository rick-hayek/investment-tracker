import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { PlatformType, DepositCurrency, CurrencyType, Deposit, Transaction } from '../../domain/types';
import { CapitalItem } from '../portfolio/CapitalList';
import { formatCurrencyValue } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';
import { useTheme, ThemePalette } from '../../theme';
import { DepositHistoryList } from './DepositHistoryList';
import {
  ChevronLeftIcon,
  DepositPlusIcon,
  WithdrawArrowIcon,
} from '../common/Icons';

export interface CapitalDetailScreenProps {
  visible: boolean;
  item: CapitalItem | null;
  deposits: Deposit[];
  transactions?: Transaction[];
  currency: CurrencyType;
  privacyMode?: boolean;
  language?: LanguageType;
  onClose: () => void;
  onOpenDeposit: (platform: PlatformType, currency: DepositCurrency) => void;
  onOpenWithdraw: (platform: PlatformType, currency: DepositCurrency) => void;
  onDeleteDeposit?: (depositId: string) => Promise<void> | void;
}

export const CapitalDetailScreen: React.FC<CapitalDetailScreenProps> = ({
  visible,
  item,
  deposits,
  transactions = [],
  currency,
  privacyMode = false,
  language = 'zh',
  onClose,
  onOpenDeposit,
  onOpenWithdraw,
  onDeleteDeposit,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // 统计当前平台与当前币种的累计入金与出金总额
  const { totalDeposited, totalWithdrawn } = useMemo(() => {
    if (!item) return { totalDeposited: 0, totalWithdrawn: 0 };
    let dep = 0;
    let wit = 0;
    for (const d of deposits) {
      if (d.platform === item.platform && d.currency === item.currency) {
        if (!d.type || d.type === 'DEPOSIT') {
          dep += d.amount;
        } else if (d.type === 'WITHDRAW') {
          wit += d.amount;
        }
      }
    }
    return { totalDeposited: dep, totalWithdrawn: wit };
  }, [item, deposits]);

  if (!item) return null;

  const coinFullName = item.currency === 'USDT' ? 'Tether' : 'USD Coin';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        {/* 顶部导航栏 */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
            <ChevronLeftIcon size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleCenter}>
            <Text style={styles.navTitle}>
              {coinFullName} ({item.currency})
            </Text>
            <View style={styles.platformBadge}>
              <Text style={styles.platformBadgeText}>{item.platform}</Text>
            </View>
          </View>

          <View style={styles.placeholderBtn} />
        </View>

        {/* 页面核心滚动区域 */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. 顶部本金总览卡片 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              {t('capitalDetail.availableCapital', language)}
            </Text>

            <View style={styles.mainValueRow}>
              <Text style={styles.mainAmount}>
                {formatCurrencyValue(item.balance, currency, { privacyMode })}
              </Text>
            </View>

            <Text style={styles.tokenBalanceSub}>
              {privacyMode ? '••••' : item.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {item.currency}
            </Text>

            {/* 累计充值与提现指标栏 */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('capitalDetail.totalDeposited', language)}</Text>
                <Text style={[styles.statValue, styles.statDeposit]}>
                  +{formatCurrencyValue(totalDeposited, currency, { privacyMode })}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('capitalDetail.totalWithdrawn', language)}</Text>
                <Text style={[styles.statValue, styles.statWithdraw]}>
                  -{formatCurrencyValue(totalWithdrawn, currency, { privacyMode })}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. 出入金流水记录 */}
          <DepositHistoryList
            deposits={deposits}
            transactions={transactions}
            platform={item.platform}
            currency={item.currency}
            baseCurrency={currency}
            language={language}
          />
        </ScrollView>

        {/* 底部悬浮快捷出入金操作条 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.btnDeposit]}
            onPress={() => onOpenDeposit(item.platform, item.currency)}
            activeOpacity={0.8}
          >
            <DepositPlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.bottomBtnText}>{t('capitalDetail.depositAction', language)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBtn, styles.btnWithdraw]}
            onPress={() => onOpenWithdraw(item.platform, item.currency)}
            activeOpacity={0.8}
          >
            <WithdrawArrowIcon size={16} color="#FFFFFF" />
            <Text style={styles.bottomBtnText}>{t('capitalDetail.withdrawAction', language)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = (colors: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    navBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderBtn: {
      width: 38,
      height: 38,
    },
    titleCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    platformBadge: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.25)',
    },
    platformBadgeText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '700',
    },
    scrollContent: {
      paddingBottom: 100,
    },
    summaryCard: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 20,
      borderRadius: 18,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    summaryLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: 6,
    },
    mainValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    mainAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    tokenBalanceSub: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
      marginTop: 4,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    statItem: {
      flex: 1,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
      marginBottom: 4,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    statDeposit: {
      color: isDark ? '#38BDF8' : '#0284C7',
    },
    statWithdraw: {
      color: isDark ? '#F43F5E' : '#E11D48',
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.divider,
      marginHorizontal: 16,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      backgroundColor: isDark ? 'rgba(9, 13, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
    },
    btnDeposit: {
      backgroundColor: '#0284C7',
    },
    btnWithdraw: {
      backgroundColor: '#E11D48',
    },
    bottomBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
