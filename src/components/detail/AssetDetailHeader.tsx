import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AssetHolding, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';
import { useTheme, ThemePalette } from '../../theme';

export interface AssetDetailHeaderProps {
  holding: AssetHolding;
  currency: CurrencyType;
  privacyMode?: boolean;
  language?: LanguageType;
}

export const AssetDetailHeader: React.FC<AssetDetailHeaderProps> = ({
  holding,
  currency,
  privacyMode = false,
  language = 'zh',
}) => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const isPositive = holding.unrealizedPnL >= 0;
  const is24hPositive = holding.change24hPercent >= 0;

  return (
    <View style={styles.card}>
      {/* 顶部标签与平台徽标 */}
      <View style={styles.headerRow}>
        <Text style={styles.cardLabel}>{t('detail.currentHoldingValue', language)}</Text>
        {holding.platform && (
          <View style={styles.platformBadge}>
            <Text style={styles.platformBadgeText}>{holding.platform}</Text>
          </View>
        )}
      </View>

      {/* 大字号市值金额 */}
      <Text style={styles.amount}>
        {formatCurrencyValue(holding.marketValue, currency, { privacyMode })}
      </Text>

      {/* 持币量与盈亏胶囊 */}
      <View style={styles.badgeRow}>
        <Text style={styles.quantityText}>
          {holding.symbol} {privacyMode ? '••••' : holding.totalQuantity} • ({is24hPositive ? '+' : ''}{holding.change24hPercent.toFixed(1)}% 24h)
        </Text>
        <View style={[styles.pnlBadge, !isPositive && styles.pnlBadgeNegative]}>
          <Text style={[styles.pnlText, !isPositive && styles.pnlTextNegative]}>
            {privacyMode ? (
              '•••••• (••%)'
            ) : (
              <>
                {isPositive ? '+' : '-'}
                {formatCurrencyValue(Math.abs(holding.unrealizedPnL), currency)} (
                {isPositive ? '+' : ''}
                {holding.unrealizedPnLPercent.toFixed(1)}%)
              </>
            )}
          </Text>
        </View>
      </View>

      {/* 指标矩阵 (持仓均价、持仓总成本、实时单价、24h涨跌) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('detail.costBasis', language)}</Text>
          <Text style={styles.metricValue}>
            {formatCurrencyValue(holding.averageCost, currency, { privacyMode })}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('detail.totalCost', language)}</Text>
          <Text style={styles.metricValue}>
            {formatCurrencyValue(holding.totalCostBasis, currency, { privacyMode })}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('detail.marketPrice', language)}</Text>
          <Text style={styles.metricValue}>
            {formatCurrencyValue(holding.currentPrice, currency)}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('detail.change24h', language)}</Text>
          <Text style={[styles.metricValue, is24hPositive ? styles.textGreen : styles.textRed]}>
            {is24hPositive ? '+' : ''}
            {holding.change24hPercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: isDark ? '#000' : 'rgba(0, 0, 0, 0.15)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 18,
      elevation: 5,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    platformBadge: {
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.4)',
    },
    platformBadgeText: {
      color: '#60A5FA',
      fontSize: 11,
      fontWeight: '700',
    },
    amount: {
      color: colors.textPrimary,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.8,
      marginBottom: 10,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      marginBottom: 14,
    },
    quantityText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    pnlBadge: {
      backgroundColor: colors.gainLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.gain,
    },
    pnlBadgeNegative: {
      backgroundColor: colors.lossLight,
      borderColor: colors.loss,
    },
    pnlText: {
      color: colors.gain,
      fontWeight: '700',
      fontSize: 13,
    },
    pnlTextNegative: {
      color: colors.loss,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 12,
    },
    metricItem: {
      width: '50%',
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 3,
    },
    metricValue: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    textGreen: {
      color: colors.gain,
    },
    textRed: {
      color: colors.loss,
    },
  });
