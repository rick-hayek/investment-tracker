import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  PanResponder,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Asset, Transaction, AssetHolding, TransactionType, PlatformType, CurrencyType, UserSettings } from './src/domain/types';
import { PnLEngine } from './src/domain/calculations/pnlEngine';
import { getNextCurrency } from './src/domain/currency';
import { AssetRepository } from './src/database/repositories/assetRepository';
import { TransactionRepository } from './src/database/repositories/transactionRepository';
import { SettingsRepository, DEFAULT_USER_SETTINGS } from './src/database/repositories/settingsRepository';
import { AddTransactionModal } from './src/components/transactions';
import { TotalPortfolioCard } from './src/components/portfolio/TotalPortfolioCard';
import { AssetList } from './src/components/portfolio/AssetList';
import { PortfolioAllocationModal } from './src/components/portfolio/PortfolioAllocationModal';
import { AppDrawer } from './src/components/drawer/AppDrawer';
import { AssetDetailScreen } from './src/components/detail';
import { SettingsScreen } from './src/components/settings';
import { PrivacyShield } from './src/components/common/PrivacyShield';
import { defaultExchangeService } from './src/services/exchangeService';
import { defaultForexService } from './src/services/forexService';
import { useMarketPoll } from './src/services/useMarketPoll';
import { MenuIcon, BellIcon } from './src/components/common/Icons';
import { LanguageType, t } from './src/i18n';
import { ThemeProvider, useTheme } from './src/theme';
import { extractBaseSymbol } from './src/services/symbolMapper';

export default function App() {
  const assetRepo = useMemo(() => new AssetRepository(), []);
  const txRepo = useMemo(() => new TransactionRepository(), []);
  const settingsRepo = useMemo(() => new SettingsRepository(), []);

  // 用户偏好设置与后台遮罩状态
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isBackgroundBlocked, setIsBackgroundBlocked] = useState(false);

  // 导航与抽屉状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyType>('USD');

  // 买卖记账弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('BUY');
  const [modalSymbol, setModalSymbol] = useState<string>('BTC');
  const [modalPlatform, setModalPlatform] = useState<PlatformType>('Binance');
  const [modalLockAsset, setModalLockAsset] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 资产配比统计弹窗
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);

  // 投资品详情全屏视图状态
  const [selectedHolding, setSelectedHolding] = useState<AssetHolding | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // 数据库实体数据
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change24h: number }>>({});
  const [refreshing, setRefreshing] = useState(false);

  // 初始化用户偏好配置与后台状态监听
  useEffect(() => {
    (async () => {
      try {
        const saved = await settingsRepo.getSettings();
        setUserSettings(saved);
        setBaseCurrency(saved.baseCurrency);
      } catch (err) {
        console.warn('Failed to load user settings:', err);
      }
    })();

    // 静默拉取最新实时汇率
    defaultForexService.fetchLatestRates().catch(() => {});

    // 监听应用切出到多任务卡片后台
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsBackgroundBlocked(nextState !== 'active');
    });

    return () => sub.remove();
  }, [settingsRepo]);

  // 更新并持久化用户配置
  const handleUpdateSettings = async (partial: Partial<UserSettings>) => {
    try {
      const updated = await settingsRepo.updateSettings(partial);
      setUserSettings(updated);
      if (partial.baseCurrency) {
        setBaseCurrency(partial.baseCurrency);
      }
    } catch (err) {
      console.warn('Failed to update settings:', err);
    }
  };

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

  // 初始化数据库与数据迁移
  const initSeedData = useCallback(async () => {
    try {
      await settingsRepo.setRawValue('initial_seed_done', 'true');
      // 数据迁移：若存在无平台后缀的旧 assetId，平滑升级为 symbol_platform
      const existingAssets = await assetRepo.findAll();
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
      await reloadData();
    } catch (err) {
      console.warn('Init seed data error:', err);
    }
  }, [assetRepo, txRepo, settingsRepo, reloadData]);

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
            // 个别资产拉取失败不中断全局
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
      const txs = transactions.filter(
        (t) => t.assetId === asset.id && (!asset.platform || t.platform === asset.platform)
      );
      const cur = marketPrices[asset.id] || marketPrices[asset.symbol.toLowerCase()] || { price: 0, change24h: 0 };
      try {
        const holding = PnLEngine.calculateHoldingFromTransactions(
          asset,
          txs,
          cur.price,
          cur.change24h
        );
        if (holding.totalQuantity > 0 || txs.length > 0) {
          list.push(holding);
        }
      } catch (err) {
        console.warn(`[App] Error calculating holding for ${asset.symbol}:`, err);
      }
    }

    const portfolio = PnLEngine.calculatePortfolioSummary(list);
    return { summary: portfolio, holdings: list };
  }, [assets, transactions, marketPrices]);

  const openAddModal = (
    type: TransactionType,
    symbol = 'BTC',
    platform: PlatformType = 'Binance',
    lockAsset = false
  ) => {
    setEditingTransaction(null);
    setModalType(type);
    setModalSymbol(symbol);
    setModalPlatform(platform);
    setModalLockAsset(lockAsset);
    setModalVisible(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalType(tx.type);
    const base = extractBaseSymbol(tx.assetId.includes('_') ? tx.assetId.split('_')[0] : tx.assetId).toUpperCase();
    setModalSymbol(base);
    setModalPlatform(tx.platform);
    setModalLockAsset(true);
    setModalVisible(true);
  };

  const handleDeleteTransaction = async (txId: string) => {
    await txRepo.delete(txId);
    await reloadData();
    await refreshPrices();
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingTransaction(null);
  };

  const handleTransactionSuccess = async () => {
    await reloadData();
    await refreshPrices();
  };

  const activeDetailHolding = useMemo(() => {
    if (!selectedHolding) return null;
    return holdings.find((h) => h.assetId === selectedHolding.assetId) || selectedHolding;
  }, [holdings, selectedHolding]);

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
    const next = getNextCurrency(baseCurrency);
    handleUpdateSettings({ baseCurrency: next });
  };

  const handleDataResetOrImported = async () => {
    setAssets([]);
    setTransactions([]);
    setMarketPrices({});
    await reloadData();
    await refreshPrices();
  };

  const currentLanguage = userSettings.language || 'zh';

  return (
    <ThemeProvider
      themeMode={userSettings.theme}
      onThemeChange={(mode) => handleUpdateSettings({ theme: mode })}
    >
      <AppContent
        edgeSwipeResponder={edgeSwipeResponder}
        currentLanguage={currentLanguage}
        userSettings={userSettings}
        baseCurrency={baseCurrency}
        handleUpdateSettings={handleUpdateSettings}
        handleCycleCurrency={handleCycleCurrency}
        holdings={holdings}
        summary={summary}
        refreshing={refreshing}
        onManualRefresh={onManualRefresh}
        openAddModal={openAddModal}
        openEditModal={openEditModal}
        editingTransaction={editingTransaction}
        handleDeleteTransaction={handleDeleteTransaction}
        handleCloseModal={handleCloseModal}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        modalVisible={modalVisible}
        modalType={modalType}
        modalSymbol={modalSymbol}
        modalPlatform={modalPlatform}
        modalLockAsset={modalLockAsset}
        setModalVisible={setModalVisible}
        handleTransactionSuccess={handleTransactionSuccess}
        allocationModalVisible={allocationModalVisible}
        setAllocationModalVisible={setAllocationModalVisible}
        detailVisible={detailVisible}
        setDetailVisible={setDetailVisible}
        setSelectedHolding={setSelectedHolding}
        activeDetailHolding={activeDetailHolding}
        settingsVisible={settingsVisible}
        setSettingsVisible={setSettingsVisible}
        assets={assets}
        transactions={transactions}
        handleDataResetOrImported={handleDataResetOrImported}
        isBackgroundBlocked={isBackgroundBlocked}
        isPolling={isPolling}
        assetRepo={assetRepo}
        txRepo={txRepo}
        settingsRepo={settingsRepo}
      />
    </ThemeProvider>
  );
}

interface AppContentProps {
  edgeSwipeResponder: any;
  currentLanguage: LanguageType;
  userSettings: UserSettings;
  baseCurrency: CurrencyType;
  handleUpdateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  handleCycleCurrency: () => void;
  holdings: AssetHolding[];
  summary: any;
  refreshing: boolean;
  onManualRefresh: () => Promise<void>;
  openAddModal: (type: TransactionType, symbol?: string, platform?: PlatformType, lockAsset?: boolean) => void;
  openEditModal: (tx: Transaction) => void;
  editingTransaction: Transaction | null;
  handleDeleteTransaction: (txId: string) => Promise<void>;
  handleCloseModal: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  modalVisible: boolean;
  modalType: TransactionType;
  modalSymbol: string;
  modalPlatform: PlatformType;
  modalLockAsset: boolean;
  setModalVisible: (open: boolean) => void;
  handleTransactionSuccess: () => Promise<void>;
  allocationModalVisible: boolean;
  setAllocationModalVisible: (open: boolean) => void;
  detailVisible: boolean;
  setDetailVisible: (open: boolean) => void;
  setSelectedHolding: (holding: AssetHolding | null) => void;
  activeDetailHolding: AssetHolding | null;
  settingsVisible: boolean;
  setSettingsVisible: (open: boolean) => void;
  assets: Asset[];
  transactions: Transaction[];
  handleDataResetOrImported: () => Promise<void>;
  isBackgroundBlocked: boolean;
  isPolling: boolean;
  assetRepo: AssetRepository;
  txRepo: TransactionRepository;
  settingsRepo: SettingsRepository;
}

function AppContent({
  edgeSwipeResponder,
  currentLanguage,
  userSettings,
  baseCurrency,
  handleUpdateSettings,
  handleCycleCurrency,
  holdings,
  summary,
  refreshing,
  onManualRefresh,
  openAddModal,
  openEditModal,
  editingTransaction,
  handleDeleteTransaction,
  handleCloseModal,
  isDrawerOpen,
  setIsDrawerOpen,
  modalVisible,
  modalType,
  modalSymbol,
  modalPlatform,
  modalLockAsset,
  setModalVisible,
  handleTransactionSuccess,
  allocationModalVisible,
  setAllocationModalVisible,
  detailVisible,
  setDetailVisible,
  setSelectedHolding,
  activeDetailHolding,
  settingsVisible,
  setSettingsVisible,
  assets,
  transactions,
  handleDataResetOrImported,
  isBackgroundBlocked,
  isPolling,
  assetRepo,
  txRepo,
  settingsRepo,
}: AppContentProps) {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      {...edgeSwipeResponder.panHandlers}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Navigation Bar Header */}
      <View style={[styles.navBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.menuButton,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => setIsDrawerOpen(true)}
          activeOpacity={0.7}
        >
          <MenuIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Investment Tracker</Text>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => openAddModal('BUY')}
          activeOpacity={0.7}
        >
          <BellIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 虚拟化持仓列表，包含总资产卡片头部 */}
      <AssetList
        holdings={holdings}
        currency={baseCurrency}
        refreshing={refreshing}
        privacyMode={userSettings.privacyMode}
        language={currentLanguage}
        onRefresh={onManualRefresh}
        onPressAsset={(holding) => {
          setSelectedHolding(holding);
          setDetailVisible(true);
        }}
        onPressAdd={() => openAddModal('BUY')}
        ListHeaderComponent={
          <View>
            {/* Total Assets Overview Card */}
            <TotalPortfolioCard
              summary={summary}
              holdings={holdings}
              currency={baseCurrency}
              isPolling={isPolling}
              privacyMode={userSettings.privacyMode}
              language={currentLanguage}
              onPressBuy={() => openAddModal('BUY')}
              onPressSell={() => openAddModal('SELL')}
              onPressAnalysis={() => setAllocationModalVisible(true)}
              onPressCurrency={handleCycleCurrency}
              onTogglePrivacy={() => handleUpdateSettings({ privacyMode: !userSettings.privacyMode })}
            />

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('nav.assets', currentLanguage)}
              </Text>
              <TouchableOpacity onPress={() => openAddModal('BUY')} activeOpacity={0.7}>
                <Text style={[styles.addLink, { color: colors.accent }]}>
                  {t('holdings.addLink', currentLanguage)}
                </Text>
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
        lockAsset={modalLockAsset}
        editingTransaction={editingTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        holdings={holdings}
        language={currentLanguage}
        onClose={handleCloseModal}
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

      {/* 投资品详情走势与流水全屏页面 */}
      <AssetDetailScreen
        visible={detailVisible}
        holding={activeDetailHolding}
        currency={baseCurrency}
        privacyMode={userSettings.privacyMode}
        language={currentLanguage}
        onClose={() => setDetailVisible(false)}
        onOpenAddTransaction={(type, symbol, platform) => {
          openAddModal(type, symbol, platform, true);
        }}
        onOpenEditTransaction={openEditModal}
        allTransactions={transactions}
        txRepo={txRepo}
        exchangeService={defaultExchangeService}
      />

      {/* 用户设置与偏好中心页面 */}
      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={userSettings}
        onUpdateSettings={handleUpdateSettings}
        assets={assets}
        transactions={transactions}
        onDataResetOrImported={handleDataResetOrImported}
        settingsRepo={settingsRepo}
        assetRepo={assetRepo}
        txRepo={txRepo}
      />

      {/* 左侧滑动边栏抽屉 */}
      <AppDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeScreen="home"
        currency={baseCurrency}
        onCurrencyChange={(next) => handleUpdateSettings({ baseCurrency: next })}
        privacyMode={userSettings.privacyMode}
        onTogglePrivacy={() => handleUpdateSettings({ privacyMode: !userSettings.privacyMode })}
        language={currentLanguage}
        onLanguageChange={(nextLang) => handleUpdateSettings({ language: nextLang })}
        themeMode={userSettings.theme}
        onThemeChange={(mode) => handleUpdateSettings({ theme: mode })}
        cloudUser={userSettings.cloudUser}
        onNavigateSettings={() => {
          setIsDrawerOpen(false);
          setSettingsVisible(true);
        }}
      />

      {/* 切出系统后台时的防截屏隐私高斯遮罩 */}
      <PrivacyShield
        visible={isBackgroundBlocked && userSettings.appSwitcherBlur}
        language={currentLanguage}
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
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
  navTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
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
