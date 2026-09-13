import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Deposit, Transaction, CurrencyType, PlatformType, DepositCurrency } from '../../domain/types';
import { extractBaseSymbol } from '../../services/symbolMapper';
import { LanguageType, t } from '../../i18n';

export interface DepositHistoryListProps {
  deposits: Deposit[];
  transactions?: Transaction[];
  platform: PlatformType;
  currency: DepositCurrency;
  baseCurrency?: CurrencyType;
  language?: LanguageType;
}

export type CapitalFlowFilterMode = 'TRANSFERS' | 'ALL';

interface CapitalFlowItem {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BUY' | 'SELL';
  amount: number;
  isPositive: boolean;
  timestamp: number;
  tokenSymbol?: string;
  tokenQuantity?: number;
  tokenPrice?: number;
  notes?: string;
}

export const DepositHistoryList: React.FC<DepositHistoryListProps> = ({
  deposits,
  transactions = [],
  platform,
  currency,
  language = 'zh',
}) => {
  const [filterMode, setFilterMode] = useState<CapitalFlowFilterMode>('TRANSFERS');

  // 构建统一本金资金流水明细
  const flowItems = useMemo<CapitalFlowItem[]>(() => {
    const items: CapitalFlowItem[] = [];

    // 1. 出入金记录
    for (const d of deposits) {
      if (d.platform === platform && d.currency === currency) {
        const isDep = !d.type || d.type === 'DEPOSIT';
        items.push({
          id: d.id,
          type: isDep ? 'DEPOSIT' : 'WITHDRAW',
          amount: d.amount,
          isPositive: isDep,
          timestamp: d.timestamp,
          notes: d.notes,
        });
      }
    }

    // 2. 筛选开启“全部”时，汇入购买代币支出与卖出回款
    if (filterMode === 'ALL' && transactions) {
      for (const tx of transactions) {
        const txCur = (tx.fundingCurrency as DepositCurrency) || 'USDT';
        if (tx.platform === platform && txCur === currency) {
          const rawSymbol = tx.assetId.includes('_') ? tx.assetId.split('_')[0] : tx.assetId;
          const tokenSymbol = extractBaseSymbol(rawSymbol).toUpperCase();
          const amountNum = tx.amount || 0;
          const priceNum = tx.price || 0;
          const feeNum = tx.fee || 0;

          if (tx.type === 'BUY') {
            const totalCost = amountNum * priceNum + feeNum;
            items.push({
              id: tx.id,
              type: 'BUY',
              amount: totalCost,
              isPositive: false,
              timestamp: tx.timestamp,
              tokenSymbol,
              tokenQuantity: amountNum,
              tokenPrice: priceNum,
              notes: tx.notes,
            });
          } else if (tx.type === 'SELL') {
            const netProceeds = amountNum * priceNum - feeNum;
            items.push({
              id: tx.id,
              type: 'SELL',
              amount: netProceeds,
              isPositive: true,
              timestamp: tx.timestamp,
              tokenSymbol,
              tokenQuantity: amountNum,
              tokenPrice: priceNum,
              notes: tx.notes,
            });
          }
        }
      }
    }

    // 按时间倒序排序 (最新在前)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [deposits, transactions, platform, currency, filterMode]);

  const getMeta = (type: CapitalFlowItem['type']) => {
    switch (type) {
      case 'DEPOSIT':
        return {
          badgeStyle: styles.badgeDeposit,
          textStyle: styles.textDeposit,
          amountStyle: styles.amountDeposit,
          label: t('deposit.depositTab', language),
        };
      case 'WITHDRAW':
        return {
          badgeStyle: styles.badgeWithdraw,
          textStyle: styles.textWithdraw,
          amountStyle: styles.amountWithdraw,
          label: t('deposit.withdrawTab', language),
        };
      case 'BUY':
        return {
          badgeStyle: styles.badgeBuy,
          textStyle: styles.textBuy,
          amountStyle: styles.amountBuy,
          label: t('capitalDetail.buyBadge', language),
        };
      case 'SELL':
        return {
          badgeStyle: styles.badgeSell,
          textStyle: styles.textSell,
          amountStyle: styles.amountSell,
          label: t('capitalDetail.sellBadge', language),
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* 标题栏与过滤按钮 */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeftGroup}>
          <Text style={styles.sectionTitle}>
            {filterMode === 'TRANSFERS'
              ? t('capitalDetail.historyTitle', language)
              : t('capitalDetail.allFlowsTitle', language)}
          </Text>
          <Text style={styles.countText}>
            {language === 'zh' ? `共 ${flowItems.length} 笔记录` : `${flowItems.length} records`}
          </Text>
        </View>

        {/* 筛选切换胶囊按钮 */}
        <View style={styles.filterPillContainer}>
          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'TRANSFERS' && styles.filterPillActive]}
            onPress={() => setFilterMode('TRANSFERS')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === 'TRANSFERS' && styles.filterPillTextActive,
              ]}
            >
              {t('capitalDetail.filterTransfers', language)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'ALL' && styles.filterPillActive]}
            onPress={() => setFilterMode('ALL')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === 'ALL' && styles.filterPillTextActive,
              ]}
            >
              {t('capitalDetail.filterAll', language)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 流水列表卡片 */}
      {flowItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {filterMode === 'TRANSFERS'
              ? t('capitalDetail.emptyHistory', language)
              : t('capitalDetail.emptyAllFlows', language)}
          </Text>
        </View>
      ) : (
        <View style={styles.tableCard}>
          {flowItems.map((item, index) => {
            const isLast = index === flowItems.length - 1;
            const meta = getMeta(item.type);

            const dateStr = new Date(item.timestamp).toLocaleString(
              language === 'zh' ? 'zh-CN' : 'en-US',
              {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            return (
              <React.Fragment key={`${item.type}_${item.id}`}>
                <View style={styles.rowItem}>
                  {/* 行左侧：类型徽标、时间、代币买卖说明与备注 */}
                  <View style={styles.cardLeft}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.typeBadge, meta.badgeStyle]}>
                        <Text style={[styles.typeText, meta.textStyle]}>
                          {meta.label}
                        </Text>
                      </View>
                      <Text style={styles.dateText}>{dateStr}</Text>
                    </View>

                    {/* 买入/卖出代币的量价描述 */}
                    {(item.type === 'BUY' || item.type === 'SELL') && item.tokenSymbol ? (
                      <Text style={styles.tradeDetailText}>
                        {item.type === 'BUY' ? (language === 'zh' ? '买入' : 'Buy') : (language === 'zh' ? '卖出' : 'Sell')}{' '}
                        {item.tokenQuantity} {item.tokenSymbol} @ ${item.tokenPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </Text>
                    ) : null}

                    {item.notes ? (
                      <Text style={styles.notesText} numberOfLines={2}>
                        {language === 'zh' ? '备注: ' : 'Note: '}
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>

                  {/* 行右侧：本金变化金额 */}
                  <View style={styles.cardRight}>
                    <Text style={[styles.amountText, meta.amountStyle]}>
                      {item.isPositive ? '+' : '-'}
                      {item.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{' '}
                      {currency}
                    </Text>
                  </View>
                </View>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleLeftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  filterPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#162032',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  filterPillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeDeposit: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  badgeWithdraw: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  badgeBuy: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  badgeSell: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textDeposit: {
    color: '#38BDF8',
  },
  textWithdraw: {
    color: '#F43F5E',
  },
  textBuy: {
    color: '#F59E0B',
  },
  textSell: {
    color: '#10B981',
  },
  tradeDetailText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  amountDeposit: {
    color: '#38BDF8',
  },
  amountWithdraw: {
    color: '#F43F5E',
  },
  amountBuy: {
    color: '#F59E0B',
  },
  amountSell: {
    color: '#10B981',
  },
  emptyCard: {
    backgroundColor: '#121A2B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});
