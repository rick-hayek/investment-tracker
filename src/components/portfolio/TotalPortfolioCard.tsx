import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PortfolioSummary, CurrencyType, AssetHolding } from '../../domain/types';
import { formatCurrencyValue, getCurrencySymbol } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';
import { Sparkline } from '../charts/Sparkline';
import { LinearGradient } from 'expo-linear-gradient';

import {
  EyeIcon,
  EyeOffIcon,
  AnalyticsChartIcon,
} from '../common/Icons';
import { useTheme } from '../../theme';

export type PnLDisplayMode = 'CUMULATIVE' | 'DAILY_24H';

export interface TotalPortfolioCardProps {
  summary: PortfolioSummary;
  holdings: AssetHolding[];
  currency: CurrencyType;
  isPolling?: boolean;
  privacyMode?: boolean;
  language?: LanguageType;
  onPressBuy?: () => void;
  onPressSell?: () => void;
  onPressDeposit?: () => void;
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
  language = 'zh',
  onPressBuy,
  onPressSell,
  onPressDeposit,
  onPressAnalysis,
  onPressCurrency,
  onTogglePrivacy,
}) => {
  const { colors, isDark } = useTheme();
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
    ? summary.netProfit
    : daily24hMetrics.amountUSD;
  const displayPercent = isCumulative
    ? (summary.netProfitPercent !== undefined && summary.netProfitPercent !== 0
        ? summary.netProfitPercent
        : (summary.totalNetProfitPercent || 0))
    : daily24hMetrics.percent;

  const isPositive = displayAmountUSD >= 0;

  // 生成 Sparkline 走势点阵
  const sparklineData = useMemo(() => {
    const base =
      summary.totalPortfolioValueUSD !== undefined
        ? summary.totalPortfolioValueUSD
        : summary.totalMarketValue;
    if (base <= 0 || holdings.length === 0) {
      return [];
    }
    const isUp = isPositive;
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
  }, [summary.totalPortfolioValueUSD, summary.totalMarketValue, isPositive, holdings.length]);

  const togglePnlMode = () => {
    setPnlMode((prev) => (prev === 'CUMULATIVE' ? 'DAILY_24H' : 'CUMULATIVE'));
  };

  return (
    <LinearGradient
      colors={isDark ? ['#1F293D', '#0C1322'] : ['#FFFFFF', '#F8FAFC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.totalCard, { borderColor: colors.cardBorder }]}
    >
      {/* 顶部标签与右上角分析按钮 */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.labelGroup}>
          <TouchableOpacity onPress={onPressCurrency} style={styles.labelContainer} activeOpacity={0.7}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('totalCard.totalAssets', language)} ({currency})</Text>
            <View style={[styles.currencyBadge, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.currencyBadgeText, { color: colors.accent }]}>{getCurrencySymbol(currency)}</Text>
            </View>
          </TouchableOpacity>
          {onTogglePrivacy && (
            <TouchableOpacity onPress={onTogglePrivacy} style={styles.eyeBtn} activeOpacity={0.7}>
              {privacyMode ? (
                <EyeOffIcon size={16} color={colors.textMuted} />
              ) : (
                <EyeIcon size={16} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerRight}>
          {isPolling && <Text style={[styles.liveIndicator, { color: colors.gain }]}>● {t('common.live', language)}</Text>}
          <TouchableOpacity
            style={[styles.analysisTopBtn, { backgroundColor: colors.accentLight, borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.25)' }]}
            onPress={onPressAnalysis}
            activeOpacity={0.75}
          >
            <AnalyticsChartIcon size={14} color={colors.accent} strokeWidth={2} />
            <Text style={[styles.analysisTopBtnText, { color: colors.accent }]}>{t('totalCard.analytics', language)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 大字号总金额 (持仓市值 + 现金本金储备) */}
      <Text style={[styles.totalAmount, { color: colors.textPrimary }]}>
        {formatCurrencyValue(
          summary.totalPortfolioValueUSD !== undefined
            ? summary.totalPortfolioValueUSD
            : summary.totalMarketValue,
          currency,
          { privacyMode }
        )}
      </Text>

      {/* 盈亏胶囊指示器 */}
      <View style={styles.badgeContainer}>
        <TouchableOpacity
          style={[
            styles.pnlBadge,
            {
              backgroundColor: isPositive ? colors.gainLight : colors.lossLight,
            },
          ]}
          onPress={togglePnlMode}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pnlText,
              {
                color: isPositive ? colors.gain : colors.loss,
              },
            ]}
          >
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
          <Text
            style={[
              styles.modeTagText,
              {
                color: isPositive ? colors.gain : colors.loss,
              },
            ]}
          >
            {isCumulative ? `${t('totalCard.cumulative', language)} ⇄` : `${t('totalCard.daily24h', language)} ⇄`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sparkline 微缩走势图 */}
      {sparklineData.length > 0 ? (
        <View style={styles.sparklineContainer}>
          <Sparkline
            data={sparklineData}
            width={310}
            height={68}
            isPositive={isPositive}
          />
        </View>
      ) : (
        <View style={{ height: 16 }} />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  totalCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 24,
    padding: 20,
    paddingBottom: 16,
    marginBottom: 20,
    overflow: 'hidden',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analysisTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  analysisTopBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
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
});

