import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { LanguageType, t } from '../../i18n';

export interface TransactionHistoryListProps {
  transactions: Transaction[];
  currentPrice: number;
  averageCost: number;
  currency: CurrencyType;
  language?: LanguageType;
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  transactions,
  currentPrice,
  averageCost,
  currency,
  language = 'zh',
}) => {
  // 按成交时间降序排列 (最新在前)
  const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

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

      <View style={styles.list}>
        {sorted.map((tx) => {
          const isBuy = tx.type === 'BUY';
          const totalValUSD = tx.amount * tx.price;

          // 动态计算单笔盈亏
          let pnlAmountUSD = 0;
          let pnlPercent = 0;

          if (isBuy) {
            // 买入单：根据当前市价计算未实现浮动盈亏
            pnlAmountUSD = (currentPrice - tx.price) * tx.amount;
            pnlPercent = tx.price > 0 ? ((currentPrice - tx.price) / tx.price) * 100 : 0;
          } else {
            // 卖出单：根据当时持仓均价计算结算已实现盈亏
            pnlAmountUSD = (tx.price - (averageCost || tx.price)) * tx.amount - (tx.fee || 0);
            pnlPercent = averageCost > 0 ? ((tx.price - averageCost) / averageCost) * 100 : 0;
          }

          const isPnlPositive = pnlAmountUSD >= 0;
          const dateStr = new Date(tx.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <View key={tx.id} style={styles.card}>
              {/* 卡片左侧：类型、平台、时间与买卖量 */}
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
                    {isBuy ? '+' : '-'}{tx.amount}
                  </Text>
                  <Text style={styles.priceSubText}>
                    @ {formatCurrencyValue(tx.price, currency)}
                  </Text>
                  <Text style={styles.totalSubText}>
                    ({language === 'zh' ? '总额' : 'Total'} {formatCurrencyValue(totalValUSD, currency)})
                  </Text>
                </View>

                {tx.notes ? (
                  <Text style={styles.notesText}>{language === 'zh' ? '备注' : 'Notes'}: {tx.notes}</Text>
                ) : null}
              </View>

              {/* 卡片右侧：单笔盈亏与已实现/未实现状态 */}
              <View style={styles.cardRight}>
                <Text style={[styles.pnlAmountText, isPnlPositive ? styles.textBuy : styles.textSell]}>
                  {isPnlPositive ? '+' : ''}
                  {formatCurrencyValue(pnlAmountUSD, currency)}
                </Text>
                <Text style={[styles.pnlPercentText, isPnlPositive ? styles.textBuy : styles.textSell]}>
                  {isPnlPositive ? '+' : ''}
                  {pnlPercent.toFixed(1)}%
                </Text>
                <View style={[styles.statusTag, isBuy ? styles.statusUnrealized : styles.statusRealized]}>
                  <Text style={[styles.statusTagText, isBuy ? styles.statusTextUnrealized : styles.statusTextRealized]}>
                    {isBuy ? t('detail.unrealized', language) : t('detail.realized', language)}
                  </Text>
                </View>
              </View>
            </View>
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
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: 'rgba(18, 26, 43, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    gap: 6,
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
    gap: 2,
    marginLeft: 10,
  },
  pnlAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pnlPercentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
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
