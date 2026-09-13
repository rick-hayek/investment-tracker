import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AssetHolding, CurrencyType, Transaction } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';
import { useTheme } from '../../theme/ThemeContext';
import { AnalyticsChartIcon } from '../common/Icons';

export interface AssetPerformanceCardProps {
  holding: AssetHolding;
  transactions?: Transaction[];
  currency: CurrencyType;
  privacyMode?: boolean;
  language?: LanguageType;
}

export const AssetPerformanceCard: React.FC<AssetPerformanceCardProps> = ({
  holding,
  transactions = [],
  currency,
  privacyMode = false,
  language = 'zh',
}) => {
  const { colors, isDark } = useTheme();

  // 从流水与持仓聚合该代币的投资战绩
  const buyTxs = transactions.filter((t) => t.type === 'BUY');
  const sellTxs = transactions.filter((t) => t.type === 'SELL');

  const calculatedBoughtCost = buyTxs.reduce(
    (sum, t) => sum + t.amount * t.price + (t.fee || 0),
    0
  );
  const calculatedSoldProceeds = sellTxs.reduce(
    (sum, t) => sum + t.amount * t.price - (t.fee || 0),
    0
  );

  const totalInvested =
    holding.cumulativeCostBasis && holding.cumulativeCostBasis > 0
      ? holding.cumulativeCostBasis
      : (holding.totalBoughtCost && holding.totalBoughtCost > 0
          ? holding.totalBoughtCost
          : calculatedBoughtCost);

  const totalSold =
    holding.totalSoldProceeds && holding.totalSoldProceeds > 0
      ? holding.totalSoldProceeds
      : calculatedSoldProceeds;

  const totalProfit =
    holding.totalProfit !== undefined
      ? holding.totalProfit
      : holding.realizedPnL + holding.unrealizedPnL;

  const totalRoiPercent =
    totalInvested > 0
      ? (totalProfit / totalInvested) * 100
      : (holding.totalProfitPercent !== undefined ? holding.totalProfitPercent : 0);

  const isProfitPositive = totalProfit >= 0;
  const isRealizedPositive = holding.realizedPnL >= 0;
  const isUnrealizedPositive = holding.unrealizedPnL >= 0;
  const isClosed = holding.totalQuantity === 0;

  return (
    <LinearGradient
      colors={isDark ? ['#162032', '#0D1424'] : ['#FFFFFF', '#F8FAFC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: colors.cardBorder }]}
    >
      {/* 顶部标题行与持仓状态徽标 */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AnalyticsChartIcon size={16} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {t('detail.performanceTitle', language)}
          </Text>
        </View>

        <View
          style={[
            styles.statusTag,
            {
              backgroundColor: isClosed ? 'rgba(148, 163, 184, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              borderColor: isClosed ? 'rgba(148, 163, 184, 0.3)' : 'rgba(56, 189, 248, 0.3)',
            },
          ]}
        >
          <Text
            style={[
              styles.statusTagText,
              { color: isClosed ? colors.textMuted : colors.accent },
            ]}
          >
            {isClosed
              ? t('detail.closedPosition', language)
              : t('detail.activePosition', language)}
          </Text>
        </View>
      </View>

      {/* 累计总盈利大字号指示 */}
      <View style={styles.mainMetricContainer}>
        <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>
          {t('detail.totalProfit', language)}
        </Text>
        <View style={styles.profitRow}>
          <Text
            style={[
              styles.profitAmount,
              { color: isProfitPositive ? colors.gain : colors.loss },
            ]}
          >
            {privacyMode
              ? '••••••'
              : `${isProfitPositive ? '+' : '-'}${formatCurrencyValue(
                  Math.abs(totalProfit),
                  currency
                )}`}
          </Text>

          <View
            style={[
              styles.roiBadge,
              {
                backgroundColor: isProfitPositive ? colors.gainLight : colors.lossLight,
              },
            ]}
          >
            <Text
              style={[
                styles.roiText,
                { color: isProfitPositive ? colors.gain : colors.loss },
              ]}
            >
              {privacyMode
                ? '••%'
                : `${isProfitPositive ? '+' : ''}${totalRoiPercent.toFixed(1)}%`}
            </Text>
          </View>
        </View>
      </View>

      {/* 2x2 指标矩阵 (已实现盈亏、未实现浮盈、累计买入投入、累计卖出回款) */}
      <View style={[styles.metricsGrid, { borderTopColor: colors.cardBorder }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('detail.realized', language)}
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: isRealizedPositive ? colors.gain : colors.loss },
            ]}
          >
            {privacyMode
              ? '••••'
              : `${isRealizedPositive ? '+' : '-'}${formatCurrencyValue(
                  Math.abs(holding.realizedPnL),
                  currency
                )}`}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('detail.unrealized', language)}
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: isUnrealizedPositive ? colors.gain : colors.loss },
            ]}
          >
            {privacyMode
              ? '••••'
              : `${isUnrealizedPositive ? '+' : '-'}${formatCurrencyValue(
                  Math.abs(holding.unrealizedPnL),
                  currency
                )}`}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('detail.totalBought', language)}
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {formatCurrencyValue(totalInvested, currency, { privacyMode })}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t('detail.totalSold', language)}
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {formatCurrencyValue(totalSold, currency, { privacyMode })}
          </Text>
        </View>
      </View>

      {/* 底部流水统计说明 */}
      {transactions.length > 0 && (
        <View style={[styles.footerRow, { borderTopColor: colors.cardBorder }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {t('detail.tradeStats', language).replace('{count}', String(transactions.length))} (
            {language === 'zh'
              ? `买入 ${buyTxs.length} 次 · 卖出 ${sellTxs.length} 次`
              : `${buyTxs.length} Buys · ${sellTxs.length} Sells`}
            )
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mainMetricContainer: {
    marginBottom: 14,
  },
  mainLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  profitAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  roiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roiText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingTop: 12,
    rowGap: 10,
  },
  metricItem: {
    width: '50%',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
