import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Asset, Transaction, AssetHolding, TransactionType, PlatformType, CurrencyType } from './src/domain/types';
import { PnLEngine } from './src/domain/calculations/pnlEngine';
import { getNextCurrency } from './src/domain/currency';
import { AssetRepository } from './src/database/repositories/assetRepository';
import { TransactionRepository } from './src/database/repositories/transactionRepository';
import { AddTransactionModal } from './src/components/transactions';
import { TotalPortfolioCard } from './src/components/portfolio/TotalPortfolioCard';
import { AssetList } from './src/components/portfolio/AssetList';
import { PortfolioAllocationModal } from './src/components/portfolio/PortfolioAllocationModal';
import { AppDrawer } from './src/components/drawer/AppDrawer';
import { defaultExchangeService } from './src/services/exchangeService';
import { useMarketPoll } from './src/services/useMarketPoll';

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

  // 导航与抽屉状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyType>('USD');

  // 买卖记账弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('BUY');
  const [modalSymbol, setModalSymbol] = useState<string>('BTC');
  const [modalPlatform, setModalPlatform] = useState<PlatformType>('Binance');

  // 资产配比统计弹窗
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);

  // 数据库实体数据
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

  // 初始化种子数据
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
        // 数据迁移：若存在无平台后缀的旧 assetId，平滑升级为 symbol_platform
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

  // 屏幕左边缘右滑手势侦听器 (Edge Swipe)
  const edgeSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // 当从屏幕最左侧 40px 内向右划过 25px 时触发
        return evt.nativeEvent.pageX < 40 && gestureState.dx > 25 && Math.abs(gestureState.dy) < 40;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 30) {
          setIsDrawerOpen(true);
        }
      },
    })
  ).current;

  // 点击法币轮转
  const handleCycleCurrency = () => {
    setBaseCurrency((prev) => getNextCurrency(prev));
  };

  return (
    <SafeAreaView style={styles.container} {...edgeSwipeResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />

      {/* Navigation Bar Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsDrawerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Investment Tracker</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => openAddModal('BUY')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIconText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* 虚拟化持仓列表，包含总资产卡片头部 */}
      <AssetList
        holdings={holdings}
        currency={baseCurrency}
        refreshing={refreshing}
        onRefresh={onManualRefresh}
        onPressAsset={(holding) => openAddModal('BUY', holding.symbol, holding.platform || 'Binance')}
        onPressAdd={() => openAddModal('BUY')}
        ListHeaderComponent={
          <View>
            {/* Total Assets Overview Card */}
            <TotalPortfolioCard
              summary={summary}
              holdings={holdings}
              currency={baseCurrency}
              isPolling={isPolling}
              onPressBuy={() => openAddModal('BUY')}
              onPressSell={() => openAddModal('SELL')}
              onPressAnalysis={() => setAllocationModalVisible(true)}
              onPressCurrency={handleCycleCurrency}
            />

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>持仓投资品 (Holdings)</Text>
              <TouchableOpacity onPress={() => openAddModal('BUY')}>
                <Text style={styles.addLink}>+ 添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* 资产买卖记录弹窗 */}
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

      {/* 资产配比与统计分析弹窗 */}
      <PortfolioAllocationModal
        visible={allocationModalVisible}
        onClose={() => setAllocationModalVisible(false)}
        holdings={holdings}
        totalMarketValue={summary.totalMarketValue}
        currency={baseCurrency}
      />

      {/* 左侧滑动边栏抽屉 */}
      <AppDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeScreen="home"
        currency={baseCurrency}
        onCurrencyChange={(next) => setBaseCurrency(next)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
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
});
