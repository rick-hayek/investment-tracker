import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, ScrollView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Navigation Bar Header */}
        <View style={styles.navBar}>
          <View style={styles.iconButton}>
            <Text style={styles.hamburgerText}>☰</Text>
          </View>
          <Text style={styles.navTitle}>Investment Tracker</Text>
          <View style={styles.iconButton}>
            <Text style={styles.navIconText}>＋</Text>
          </View>
        </View>

        {/* Total Assets Overview Card */}
        <View style={styles.totalCard}>
          <Text style={styles.cardLabel}>总资产估值 (USD)</Text>
          <Text style={styles.totalAmount}>$128,450.80</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.pnlBadge}>
              <Text style={styles.pnlText}>▲ +$14,230.50 (+12.4%)</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>➕ 买入记录</Text>
            </View>
            <View style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>➖ 卖出记账</Text>
            </View>
            <View style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>⚙️ 统计分析</Text>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>持仓投资品 (Holdings)</Text>
          <Text style={styles.addLink}>+ 添加</Text>
        </View>

        {/* Sample Asset Cards */}
        <View style={styles.assetCard}>
          <View style={styles.assetLeft}>
            <View style={[styles.coinIcon, { backgroundColor: '#F7931A' }]}>
              <Text style={styles.coinIconText}>₿</Text>
            </View>
            <View>
              <Text style={styles.assetName}>Bitcoin</Text>
              <Text style={styles.assetSub}>1.0 BTC • $68,420.00</Text>
            </View>
          </View>
          <View style={styles.assetRight}>
            <Text style={styles.assetValue}>$68,420.00</Text>
            <Text style={styles.pnlGreen}>+3.8% (+$2,480)</Text>
          </View>
        </View>

        <View style={styles.assetCard}>
          <View style={styles.assetLeft}>
            <View style={[styles.coinIcon, { backgroundColor: '#627EEA' }]}>
              <Text style={styles.coinIconText}>Ξ</Text>
            </View>
            <View>
              <Text style={styles.assetName}>Ethereum</Text>
              <Text style={styles.assetSub}>10.0 ETH • $3,540.25</Text>
            </View>
          </View>
          <View style={styles.assetRight}>
            <Text style={styles.assetValue}>$35,402.50</Text>
            <Text style={styles.pnlGreen}>+5.2% (+$1,750)</Text>
          </View>
        </View>

        <View style={styles.assetCard}>
          <View style={styles.assetLeft}>
            <View style={[styles.coinIcon, { backgroundColor: '#14F195' }]}>
              <Text style={[styles.coinIconText, { color: '#090D16' }]}>S</Text>
            </View>
            <View>
              <Text style={styles.assetName}>Solana</Text>
              <Text style={styles.assetSub}>100 SOL • $145.20</Text>
            </View>
          </View>
          <View style={styles.assetRight}>
            <Text style={styles.assetValue}>$14,520.00</Text>
            <Text style={styles.pnlRed}>-1.2% (-$180)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerText: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  navTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  navIconText: {
    color: '#F8FAFC',
    fontSize: 18,
  },
  totalCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
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
    marginBottom: 20,
  },
  pnlBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pnlText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  addLink: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  assetCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  assetName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  assetSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pnlGreen: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pnlRed: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
