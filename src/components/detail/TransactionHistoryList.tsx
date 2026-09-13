import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction, CurrencyType, PlatformType } from '../../domain/types';
import { PnLEngine } from '../../domain/calculations/pnlEngine';
import { formatCurrencyValue } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';

export interface TransactionHistoryListProps {
  transactions: Transaction[];
  platform?: PlatformType;
  currentPrice: number;
  averageCost?: number;
  currency: CurrencyType;
  privacyMode?: boolean;
  language?: LanguageType;
  onPressTransaction?: (tx: Transaction) => void;
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  transactions,
  platform,
  currentPrice,
  averageCost,
  currency,
  privacyMode = false,
  language = 'zh',
  onPressTransaction,
}) => {
  // 严格过滤仅属于当前平台的交易
  const filtered = useMemo(() => {
    return platform
      ? transactions.filter((tx) => tx.platform === platform)
      : transactions;
  }, [transactions, platform]);

  // 逐笔时序回溯计算每笔交易的已实现盈亏、收益率与发生时的持仓成本
  const pnlMap = useMemo(() => {
    return PnLEngine.calculateTransactionPnLList(filtered);
  }, [filtered]);

  // 按成交时间降序排列 (最新在前展示)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      if (b.type !== a.type) {
        return b.type === 'SELL' ? -1 : 1;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [filtered]);

  if (sorted.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          {language === 'zh' ? '暂无历史交易流水' : 'No transactions recorded'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>{t('detail.transactionHistory', language)}</Text>
        <Text style={styles.countText}>
          {language === 'zh' ? `共 ${sorted.length} 笔记录` : `${sorted.length} records`}
        </Text>
      </View>

      <View style={styles.tableCard}>
        {sorted.map((tx, index) => {
          const isBuy = tx.type === 'BUY';
          const info = pnlMap.get(tx.id);
          const totalValUSD = tx.amount * tx.price;
          const isLast = index === sorted.length - 1;

          // 卖出交易结算数据
          const realizedPnL = info?.realizedPnL ?? 0;
          const realizedPnLPercent = info?.realizedPnLPercent ?? 0;
          const isPnlPositive = realizedPnL > 0;
          const isPnlZero = realizedPnL === 0;
          const costBasisAtSale = info?.costBasisAtSale;

          // 买入交易支出数据
          const buyCostUSD = info?.buyCostUSD ?? (totalValUSD + (tx.fee || 0));

          const dateStr = new Date(tx.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <React.Fragment key={tx.id}>
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => onPressTransaction?.(tx)}
                activeOpacity={0.7}
              >
                {/* 行左侧：类型、平台、时间与买卖量 */}
                <View style={styles.cardLeft}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.typeBadge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
                      <Text style={[styles.typeText, isBuy ? styles.textBuy : styles.textSell]}>
                        {isBuy ? t('transaction.buy', language) : t('transaction.sell', language)}
                      </Text>
                    </View>
                    <View style={styles.platformBadge}>
                      <Text style={styles.platformText}>{tx.platform}</Text>
                    </View>
                    <Text style={styles.dateText}>{dateStr}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.amountText}>
                      {isBuy ? '+' : '-'}{privacyMode ? '****' : tx.amount}
                    </Text>
                    <Text style={styles.priceSubText}>
                      @ {formatCurrencyValue(tx.price, currency, { privacyMode })}
                    </Text>
                    {!isBuy && costBasisAtSale !== undefined && costBasisAtSale > 0 ? (
                      <Text style={styles.costSubText}>
                        ({t('detail.costAtSale', language)} @ {formatCurrencyValue(costBasisAtSale, currency, { privacyMode })})
                      </Text>
                    ) : (
                      <Text style={styles.totalSubText}>
                        ({language === 'zh' ? '总额' : 'Total'} {formatCurrencyValue(totalValUSD, currency, { privacyMode })})
                      </Text>
                    )}
                  </View>

                  {tx.notes ? (
                    <Text style={styles.notesText}>{language === 'zh' ? '备注' : 'Notes'}: {tx.notes}</Text>
                  ) : null}
                </View>

                {/* 行右侧：
                    - 卖出：展示准确已实现盈亏 (+$20,000.00 (+34.9%) / -$10,000.00 (-17.4%)) 与已实现盈利/亏损标签
                    - 买入：展示买入总支出与买入支出标签
                */}
                <View style={styles.cardRight}>
                  {isBuy ? (
                    <>
                      <View style={styles.pnlRow}>
                        <Text style={styles.buyCostAmountText}>
                          {formatCurrencyValue(buyCostUSD, currency, { privacyMode })}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, styles.statusBuyExpenditure]}>
                        <Text style={[styles.statusTagText, styles.statusTextBuyExpenditure]}>
                          {t('detail.buyExpenditure', language)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.pnlRow}>
                        <Text
                          style={[
                            styles.pnlAmountText,
                            isPnlPositive ? styles.textBuy : (isPnlZero ? styles.textNeutral : styles.textSell),
                          ]}
                        >
                          {isPnlPositive ? '+' : (isPnlZero ? '' : '-')}
                          {formatCurrencyValue(Math.abs(realizedPnL), currency, { privacyMode })}
                        </Text>
                        <Text
                          style={[
                            styles.pnlPercentInline,
                            isPnlPositive ? styles.textBuy : (isPnlZero ? styles.textNeutral : styles.textSell),
                          ]}
                        >
                          {' '}({isPnlPositive ? '+' : ''}{realizedPnLPercent.toFixed(1)}%)
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          isPnlPositive
                            ? styles.statusProfit
                            : (isPnlZero ? styles.statusNeutral : styles.statusLoss),
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            isPnlPositive
                              ? styles.statusTextProfit
                              : (isPnlZero ? styles.statusTextNeutral : styles.statusTextLoss),
                          ]}
                        >
                          {isPnlPositive
                            ? t('detail.realizedProfit', language)
                            : (isPnlZero ? t('detail.realized', language) : t('detail.realizedLoss', language))}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
              {!isLast && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  countText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  tableCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBuy: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeSell: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textBuy: {
    color: '#10B981',
  },
  textSell: {
    color: '#EF4444',
  },
  platformBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  dateText: {
    color: '#64748B',
    fontSize: 11,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  amountText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  priceSubText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  totalSubText: {
    color: '#64748B',
    fontSize: 11,
  },
  notesText: {
    color: '#38BDF8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 3,
    marginLeft: 10,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pnlAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pnlPercentInline: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  costSubText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  buyCostAmountText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  textNeutral: {
    color: '#94A3B8',
  },
  statusProfit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusTextProfit: {
    color: '#10B981',
  },
  statusLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusTextLoss: {
    color: '#EF4444',
  },
  statusNeutral: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusTextNeutral: {
    color: '#F59E0B',
  },
  statusBuyExpenditure: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  statusTextBuyExpenditure: {
    color: '#38BDF8',
  },
  statusUnrealized: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  statusRealized: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusTextUnrealized: {
    color: '#38BDF8',
  },
  statusTextRealized: {
    color: '#F59E0B',
  },
  emptyCard: {
    padding: 24,
    backgroundColor: 'rgba(18, 26, 43, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
});
