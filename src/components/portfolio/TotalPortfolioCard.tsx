import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PortfolioSummary, CurrencyType, AssetHolding } from '../../domain/types';
import { formatCurrencyValue, getCurrencySymbol } from '../../domain/currency';
import { Sparkline } from '../charts/Sparkline';

import {
  EyeIcon,
  EyeOffIcon,
  DepositPlusIcon,
  WithdrawArrowIcon,
  AnalyticsChartIcon,
} from '../common/Icons';

export type PnLDisplayMode = 'CUMULATIVE' | 'DAILY_24H';

export interface TotalPortfolioCardProps {
  summary: PortfolioSummary;
  holdings: AssetHolding[];
  currency: CurrencyType;
  isPolling?: boolean;
  privacyMode?: boolean;
  onPressBuy: () => void;
  onPressSell: () => void;
  onPressAnalysis: () => void;
  onPressCurrency?: () => void;
  onTogglePrivacy?: () => void;
}

export const TotalPortfolioCard: React.FC<TotalPortfolioCardProps> = ({
  summary,
  holdings,
  currency,
  isPolling = false,
  privacyMode = false,
  onPressBuy,
  onPressSell,
  onPressAnalysis,
  onPressCurrency,
  onTogglePrivacy,
}) => {
  const [pnlMode, setPnlMode] = useState<PnLDisplayMode>('CUMULATIVE');

  // 计算当日 24h 盈亏估算
  const daily24hMetrics = useMemo(() => {
    let total24hChangeAmountUSD = 0;
    for (const h of holdings) {
      if (h.marketValue > 0 && h.change24hPercent) {
        total24hChangeAmountUSD += h.marketValue * (h.change24hPercent / 100);
      }
    }
    const percent =
      summary.totalMarketValue > 0
        ? (total24hChangeAmountUSD / summary.totalMarketValue) * 100
        : 0;

    return {
      amountUSD: total24hChangeAmountUSD,
      percent,
    };
  }, [holdings, summary.totalMarketValue]);

  const isCumulative = pnlMode === 'CUMULATIVE';
  const displayAmountUSD = isCumulative
    ? summary.totalUnrealizedPnL
    : daily24hMetrics.amountUSD;
  const displayPercent = isCumulative
    ? summary.totalUnrealizedPnLPercent
    : daily24hMetrics.percent;

  const isPositive = displayAmountUSD >= 0;

  // 生成 Sparkline 走势点阵
  const sparklineData = useMemo(() => {
    const base = summary.totalMarketValue || 100000;
    const isUp = summary.totalUnrealizedPnL >= 0;
    if (isUp) {
      return [
        base * 0.88,
        base * 0.91,
        base * 0.89,
        base * 0.94,
        base * 0.93,
        base * 0.97,
        base * 0.99,
        base,
      ];
    } else {
      return [
        base * 1.12,
        base * 1.09,
        base * 1.08,
        base * 1.04,
        base * 1.05,
        base * 1.02,
        base * 1.01,
        base,
      ];
    }
  }, [summary.totalMarketValue, summary.totalUnrealizedPnL]);

  const togglePnlMode = () => {
    setPnlMode((prev) => (prev === 'CUMULATIVE' ? 'DAILY_24H' : 'CUMULATIVE'));
  };

  return (
    <View style={styles.totalCard}>
      {/* 顶部标签与实时指示器 (匹配 01_home_screen.jpg) */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.labelGroup}>
          <TouchableOpacity onPress={onPressCurrency} style={styles.labelContainer} activeOpacity={0.7}>
            <Text style={styles.cardLabel}>Total Assets ({currency})</Text>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{getCurrencySymbol(currency)}</Text>
            </View>
          </TouchableOpacity>
          {onTogglePrivacy && (
            <TouchableOpacity onPress={onTogglePrivacy} style={styles.eyeBtn} activeOpacity={0.7}>
              {privacyMode ? (
                <EyeOffIcon size={16} color="#64748B" />
              ) : (
                <EyeIcon size={16} color="#94A3B8" />
              )}
            </TouchableOpacity>
          )}
        </View>
        {isPolling && <Text style={styles.liveIndicator}>● Live</Text>}
      </View>

      {/* 大字号总金额 */}
      <Text style={styles.totalAmount}>
        {formatCurrencyValue(summary.totalMarketValue, currency, { privacyMode })}
      </Text>

      {/* 盈亏胶囊指示器 */}
      <View style={styles.badgeContainer}>
        <TouchableOpacity
          style={[styles.pnlBadge, !isPositive && styles.pnlBadgeNegative]}
          onPress={togglePnlMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.pnlText, !isPositive && styles.pnlTextNegative]}>
            {privacyMode ? (
              '•••••• (••%)'
            ) : (
              <>
                {isPositive ? '+' : '-'}
                {formatCurrencyValue(Math.abs(displayAmountUSD), currency)} (
                {isPositive ? '+' : ''}
                {displayPercent.toFixed(1)}%)
              </>
            )}
          </Text>
          <Text style={styles.modeTagText}>
            {isCumulative ? '累计 ⇄' : '24H ⇄'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sparkline 微缩走势图 */}
      <View style={styles.sparklineContainer}>
        <Sparkline
          data={sparklineData}
          width={310}
          height={68}
          isPositive={summary.totalUnrealizedPnL >= 0}
        />
      </View>

      {/* 快捷操作胶囊 (方案 A: 买入 / 卖出 / 资产分析，匹配设计稿线条图标) */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onPressBuy} activeOpacity={0.7}>
          <DepositPlusIcon size={16} color="#38BDF8" strokeWidth={2} />
          <Text style={styles.actionBtnText}>买入 (Buy)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onPressSell} activeOpacity={0.7}>
          <WithdrawArrowIcon size={16} color="#F8FAFC" strokeWidth={2} />
          <Text style={styles.actionBtnText}>卖出 (Sell)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onPressAnalysis} activeOpacity={0.7}>
          <AnalyticsChartIcon size={16} color="#A7F3D0" strokeWidth={2} />
          <Text style={styles.actionBtnText}>资产分析</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  totalCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyeBtn: {
    padding: 2,
  },
  eyeBtnText: {
    fontSize: 14,
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  currencyBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currencyBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  liveIndicator: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  totalAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  pnlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  modeTagText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  sparklineContainer: {
    marginVertical: 6,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#212836',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
});
