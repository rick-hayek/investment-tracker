import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AssetHolding, CurrencyType } from '../../domain/types';
import { formatCurrencyValue } from '../../domain/currency';
import { KNOWN_ASSETS } from '../../services/symbolMapper';

interface PortfolioAllocationModalProps {
  visible: boolean;
  onClose: () => void;
  holdings: AssetHolding[];
  totalMarketValue: number;
  currency: CurrencyType;
}

export const PortfolioAllocationModal: React.FC<PortfolioAllocationModalProps> = ({
  visible,
  onClose,
  holdings,
  totalMarketValue,
  currency,
}) => {
  // 按市值从大到小排序
  const sortedHoldings = [...holdings].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>资产配比与统计分析</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* 总资产快照卡片 */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>投资组合总估值</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyValue(totalMarketValue, currency)}
              </Text>
              <Text style={styles.summarySub}>共持有 {holdings.length} 个资产仓位</Text>
            </View>

            {/* 资产配比进度条 */}
            <Text style={styles.sectionTitle}>仓位占比分布</Text>
            {sortedHoldings.length === 0 ? (
              <Text style={styles.emptyText}>暂无持仓资产数据</Text>
            ) : (
              sortedHoldings.map((h) => {
                const percent =
                  totalMarketValue > 0
                    ? ((h.marketValue / totalMarketValue) * 100)
                    : 0;
                const meta = KNOWN_ASSETS[h.symbol];
                const barColor = meta ? meta.color : '#3B82F6';

                return (
                  <View key={h.assetId} style={styles.itemRow}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemLeft}>
                        <View style={[styles.dot, { backgroundColor: barColor }]} />
                        <Text style={styles.symbolText}>{h.name}</Text>
                        {h.platform && (
                          <View style={styles.platformBadge}>
                            <Text style={styles.platformBadgeText}>{h.platform}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.valText}>
                          {formatCurrencyValue(h.marketValue, currency)}
                        </Text>
                        <Text style={styles.percentText}>{percent.toFixed(1)}%</Text>
                      </View>
                    </View>

                    {/* 百分比进度条 */}
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(100, Math.max(1, percent))}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0E1626',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '80%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  summarySub: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  itemRow: {
    backgroundColor: 'rgba(18, 26, 43, 0.6)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  symbolText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  platformBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  platformBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '600',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  valText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  percentText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
