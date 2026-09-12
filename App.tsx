import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Asset, Transaction, AssetHolding, TransactionType, PlatformType } from './src/domain/types';
import { PnLEngine } from './src/domain/calculations/pnlEngine';
import { AssetRepository } from './src/database/repositories/assetRepository';
import { TransactionRepository } from './src/database/repositories/transactionRepository';
import { AddTransactionModal } from './src/components/transactions';
import { defaultExchangeService } from './src/services/exchangeService';
import { useMarketPoll } from './src/services/useMarketPoll';
import { KNOWN_ASSETS } from './src/services/symbolMapper';

const INITIAL_DEMO_ASSETS: Asset[] = [
  { id: 'btc_binance', symbol: 'BTC', name: 'Bitcoin', platform: 'Binance', createdAt: 1700000000000 },
  { id: 'eth_okx', symbol: 'ETH', name: 'Ethereum', platform: 'OKX', createdAt: 1700000000000 },
  { id: 'sol_coinbase', symbol: 'SOL', name: 'Solana', platform: 'Coinbase', createdAt: 1700000000000 },
];

const INITIAL_DEMO_TXS: Transaction[] = [
  {
    id: 'tx_demo_btc',
    assetId: 'btc_binance',
    type: 'BUY',
    amount: 1.0,
    price: 64500,
    platform: 'Binance',
    timestamp: Date.now() - 86400000 * 3,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'tx_demo_eth',
    assetId: 'eth_okx',
    type: 'BUY',
    amount: 10.0,
    price: 3350,
    platform: 'OKX',
    timestamp: Date.now() - 86400000 * 2,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'tx_demo_sol',
    assetId: 'sol_coinbase',
    type: 'BUY',
    amount: 100.0,
    price: 147,
    platform: 'Coinbase',
    timestamp: Date.now() - 86400000 * 1,
    createdAt: Date.now() - 86400000 * 1,
  },
];

export default function App() {
  const assetRepo = useMemo(() => new AssetRepository(), []);
  const txRepo = useMemo(() => new TransactionRepository(), []);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('BUY');
  const [modalSymbol, setModalSymbol] = useState<string>('BTC');
  const [modalPlatform, setModalPlatform] = useState<PlatformType>('Binance');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change24h: number }>>({
    btc: { price: 68420.0, change24h: 3.8 },
    eth: { price: 3540.25, change24h: 5.2 },
    sol: { price: 145.2, change24h: -1.2 },
  });
  const [refreshing, setRefreshing] = useState(false);

  const reloadData = useCallback(async () => {
    try {
      const loadedAssets = await assetRepo.findAll();
      const loadedTxs = await txRepo.findAll();
      setAssets(loadedAssets);
      setTransactions(loadedTxs);
    } catch (err) {
      console.warn('Reload data error:', err);
    }
  }, [assetRepo, txRepo]);

  // 初始化种子数据或升级旧格式数据
  const initSeedData = useCallback(async () => {
    try {
      const existingAssets = await assetRepo.findAll();
      if (existingAssets.length === 0) {
        for (const a of INITIAL_DEMO_ASSETS) {
          await assetRepo.insert(a);
        }
        for (const t of INITIAL_DEMO_TXS) {
          await txRepo.insert(t);
        }
      } else {
        // 数据迁移：若存在无平台后缀的旧 assetId，平滑升级为 symbol_platform 格式
        for (const a of existingAssets) {
          if (!a.id.includes('_')) {
            const newId = `${a.symbol.toLowerCase()}_${a.platform.toLowerCase()}`;
            await assetRepo.delete(a.id);
            await assetRepo.insert({ ...a, id: newId });
            const txs = await txRepo.findByAssetId(a.id);
            for (const tx of txs) {
              await txRepo.delete(tx.id);
              await txRepo.insert({ ...tx, assetId: newId });
            }
          }
        }
      }
      await reloadData();
    } catch (err) {
      console.warn('Init seed data error:', err);
    }
  }, [assetRepo, txRepo, reloadData]);

  useEffect(() => {
    initSeedData();
  }, [initSeedData]);

  // 刷新所有资产的实时市场价格
  const refreshPrices = useCallback(async () => {
    if (assets.length === 0) return;
    try {
      const updates: Record<string, { price: number; change24h: number }> = {};
      await Promise.all(
        assets.map(async (asset) => {
          try {
            const ticker = await defaultExchangeService.fetchTicker(asset.platform, asset.symbol);
            updates[asset.id] = {
              price: ticker.priceUSD,
              change24h: ticker.change24hPercent,
            };
            updates[asset.symbol.toLowerCase()] = {
              price: ticker.priceUSD,
              change24h: ticker.change24hPercent,
            };
          } catch {
            // 保留原有价格
          }
        })
      );
      if (Object.keys(updates).length > 0) {
        setMarketPrices((prev) => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.warn('Refresh prices error:', err);
    }
  }, [assets]);

  // 15 秒前台智能轮询 & 后台自动休眠
  const { isPolling } = useMarketPoll(refreshPrices, { intervalMs: 15000, enabled: true });

  const onManualRefresh = async () => {
    setRefreshing(true);
    await reloadData();
    await refreshPrices();
    setRefreshing(false);
  };

  // 汇总持仓统计计算
  const { summary, holdings } = useMemo(() => {
    const list: AssetHolding[] = [];

    for (const asset of assets) {
      const txs = transactions.filter((t) => t.assetId === asset.id);
      const cur = marketPrices[asset.id] || marketPrices[asset.symbol.toLowerCase()] || { price: 0, change24h: 0 };
      const holding = PnLEngine.calculateHoldingFromTransactions(
        asset,
        txs,
        cur.price,
        cur.change24h
      );
      if (holding.totalQuantity > 0 || txs.length > 0) {
        list.push(holding);
      }
    }

    const portfolio = PnLEngine.calculatePortfolioSummary(list);
    return { summary: portfolio, holdings: list };
  }, [assets, transactions, marketPrices]);

  const openAddModal = (type: TransactionType, symbol = 'BTC', platform: PlatformType = 'Binance') => {
    setModalType(type);
    setModalSymbol(symbol);
    setModalPlatform(platform);
    setModalVisible(true);
  };

  const handleTransactionSuccess = async () => {
    await reloadData();
    await refreshPrices();
  };

  const isPositive = summary.totalUnrealizedPnL >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onManualRefresh}
            tintColor="#38BDF8"
          />
        }
      >
        {/* Navigation Bar Header */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Investment Tracker</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openAddModal('BUY')}
          >
            <Text style={styles.navIconText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* Total Assets Overview Card */}
        <View style={styles.totalCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>总资产估值 (USD)</Text>
            {isPolling && <Text style={styles.liveIndicator}>● 实时行情</Text>}
          </View>
          <Text style={styles.totalAmount}>
            ${summary.totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.pnlBadge, !isPositive && styles.pnlBadgeNegative]}>
              <Text style={[styles.pnlText, !isPositive && styles.pnlTextNegative]}>
                {isPositive ? '▲ +' : '▼ -'}
                ${Math.abs(summary.totalUnrealizedPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (
                {isPositive ? '+' : ''}
                {summary.totalUnrealizedPnLPercent.toFixed(1)}%)
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openAddModal('BUY')}
            >
              <Text style={styles.actionBtnText}>➕ 买入记录</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openAddModal('SELL')}
            >
              <Text style={styles.actionBtnText}>➖ 卖出记账</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onManualRefresh}>
              <Text style={styles.actionBtnText}>🔄 刷新行情</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Header: Holdings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>持仓投资品 (Holdings)</Text>
          <TouchableOpacity onPress={() => openAddModal('BUY')}>
            <Text style={styles.addLink}>+ 添加</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Asset Cards (Per Platform) */}
        {holdings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无持仓记录，点击上方「➕ 买入记录」开启记账！</Text>
          </View>
        ) : (
          holdings.map((holding) => {
            const meta = KNOWN_ASSETS[holding.symbol];
            const iconBg = meta ? meta.color : '#3B82F6';
            const isHoldingPositive = holding.unrealizedPnL >= 0;

            return (
              <TouchableOpacity
                key={holding.assetId}
                style={styles.assetCard}
                onPress={() => openAddModal('BUY', holding.symbol, holding.platform || 'Binance')}
              >
                <View style={styles.assetLeft}>
                  <View style={[styles.coinIcon, { backgroundColor: iconBg }]}>
                    <Text
                      style={[
                        styles.coinIconText,
                        (holding.symbol === 'SOL' || holding.symbol === 'BNB') && { color: '#090D16' },
                      ]}
                    >
                      {holding.symbol.slice(0, 1)}
                    </Text>
                  </View>
                  <View>
                    <View style={styles.assetTitleRow}>
                      <Text style={styles.assetName}>{holding.name}</Text>
                      {holding.platform && (
                        <View style={styles.platformBadge}>
                          <Text style={styles.platformBadgeText}>{holding.platform}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.assetSub}>
                      {holding.totalQuantity} {holding.symbol} • $
                      {holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
                <View style={styles.assetRight}>
                  <Text style={styles.assetValue}>
                    $
                    {holding.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={isHoldingPositive ? styles.pnlGreen : styles.pnlRed}>
                    {isHoldingPositive ? '+' : ''}
                    {holding.unrealizedPnLPercent.toFixed(1)}% ({isHoldingPositive ? '+$' : '-$'}
                    {Math.abs(holding.unrealizedPnL).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={modalVisible}
        initialType={modalType}
        initialSymbol={modalSymbol}
        initialPlatform={modalPlatform}
        onClose={() => setModalVisible(false)}
        onSuccess={handleTransactionSuccess}
        assetRepo={assetRepo}
        txRepo={txRepo}
        exchangeService={defaultExchangeService}
      />
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
  cardHeaderRow: {
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
    marginBottom: 20,
  },
  pnlBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pnlBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  pnlText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  pnlTextNegative: {
    color: '#EF4444',
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
  txCountText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 26, 43, 0.4)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
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
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  platformBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  platformBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
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
  // 交易流水记录卡片样式
  txCard: {
    backgroundColor: 'rgba(18, 26, 43, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  txTagBuy: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  txTagSell: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  txTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  txTextBuy: {
    color: '#10B981',
  },
  txTextSell: {
    color: '#EF4444',
  },
  txHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txSymbolText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  txPlatformBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txPlatformText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  txDateText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  txSubText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
});
