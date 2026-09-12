import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AssetHolding, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';

export interface AssetDetailHeaderProps {
  holding: AssetHolding;
  currency: CurrencyType;
  privacyMode?: boolean;
}

export const AssetDetailHeader: React.FC<AssetDetailHeaderProps> = ({
  holding,
  currency,
  privacyMode = false,
}) => {
  const isPositive = holding.unrealizedPnL >= 0;
  const is24hPositive = holding.change24hPercent >= 0;

  return (
    <View style={styles.card}>
      {/* 顶部标签与平台徽标 */}
      <View style={styles.headerRow}>
        <Text style={styles.cardLabel}>Current Holding Value</Text>
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

      {/* 指标矩阵 (持仓均价、总成本、实时单价、24h涨跌) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>持仓成本均价</Text>
          <Text style={styles.metricValue}>
            {formatCurrencyValue(holding.averageCost, currency, { privacyMode })}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>当前持仓总成本</Text>
          <Text style={styles.metricValue}>
            {formatCurrencyValue(holding.totalCostBasis, currency, { privacyMode })}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>最新市场单价</Text>
          <Text style={styles.metricValue}>
            {formatCurrencyValue(holding.currentPrice, currency)}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>24小时涨跌幅</Text>
          <Text style={[styles.metricValue, is24hPositive ? styles.textGreen : styles.textRed]}>
            {is24hPositive ? '+' : ''}
            {holding.change24hPercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(18, 26, 43, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
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
    color: '#94A3B8',
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
    color: '#FFFFFF',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 14,
  },
  quantityText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  pnlBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pnlBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pnlText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  pnlTextNegative: {
    color: '#EF4444',
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
    color: '#64748B',
    fontSize: 12,
    marginBottom: 3,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  textGreen: {
    color: '#10B981',
  },
  textRed: {
    color: '#EF4444',
  },
});
