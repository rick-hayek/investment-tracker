import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { PlatformType, DepositCurrency, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';
import { UsdtLogo, UsdcLogo } from '../common/Icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

export interface CapitalItem {
  id: string;
  platform: PlatformType;
  currency: DepositCurrency;
  balance: number;
}

export interface CapitalListProps {
  items: CapitalItem[];
  totalCashReservesUSD: number;
  currency: CurrencyType;
  privacyMode?: boolean;
  language?: LanguageType;
  onPressDeposit: (platform?: PlatformType, currency?: DepositCurrency) => void;
  onPressItem?: (item: CapitalItem) => void;
}

export const CapitalList: React.FC<CapitalListProps> = ({
  items,
  totalCashReservesUSD,
  currency,
  privacyMode = false,
  language = 'zh',
  onPressDeposit,
  onPressItem,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('holdings.capitalListTitle', language)}
          </Text>
          <Text style={[styles.sectionAmount, { color: colors.textSecondary }]}>
            {formatCurrencyValue(totalCashReservesUSD, currency, { privacyMode })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onPressDeposit()} activeOpacity={0.7}>
          <Text style={[styles.addLink, { color: colors.accent }]}>
            {t('holdings.capitalDepositLink', language)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Capital Cards */}
      {items.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('holdings.emptyCapitalText', language)}
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.cardTouchable}
            onPress={() => (onPressItem ? onPressItem(item) : onPressDeposit(item.platform, item.currency))}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={isDark ? ['#1E2638', '#0F1522'] : ['#FFFFFF', '#F8FAFC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.7 }}
              style={[styles.capitalCard, { borderColor: colors.cardBorder }]}
            >
              <View style={styles.cardLeft}>
                {item.currency === 'USDT' ? <UsdtLogo size={32} /> : <UsdcLogo size={32} />}
                <View style={styles.nameContainer}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.coinName, { color: colors.textPrimary }]}>
                      {item.currency === 'USDT' ? 'Tether' : 'USD Coin'}
                    </Text>
                    <View style={[styles.platformBadge, { backgroundColor: colors.accentLight }]}>
                      <Text style={[styles.platformBadgeText, { color: colors.accent }]}>
                        {item.platform}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.coinSub, { color: colors.textSecondary }]}>
                    {item.currency} • {privacyMode ? '••••' : item.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </Text>
                </View>
              </View>

              <View style={styles.cardRight}>
                <Text style={[styles.coinValue, { color: colors.textPrimary }]}>
                  {formatCurrencyValue(item.balance, currency, { privacyMode })}
                </Text>
                <View style={styles.rightBottomRow}>
                  <View
                    style={[
                      styles.availableBadge,
                      { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' },
                    ]}
                  >
                    <Text style={[styles.availableBadgeText, { color: colors.gain }]}>
                      {t('holdings.capitalAvailable', language)}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardTouchable: {
    marginBottom: 8,
    borderRadius: 15,
  },
  capitalCard: {
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 8.5,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  nameContainer: {
    marginLeft: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinName: {
    fontSize: 15,
    fontWeight: '700',
  },
  platformBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
  },
  platformBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  coinSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  coinValue: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  rightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  availableBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  availableBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
