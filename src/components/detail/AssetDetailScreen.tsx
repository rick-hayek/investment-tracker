import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { AssetHolding, CurrencyType, Transaction, TransactionType, PlatformType } from '../../domain/types';
import { TransactionRepository } from '../../database/repositories/transactionRepository';
import { ExchangeService, defaultExchangeService } from '../../services/exchangeService';
import { AssetDetailHeader } from './AssetDetailHeader';
import { AssetPerformanceCard } from './AssetPerformanceCard';
import { InteractiveChart } from '../charts/InteractiveChart';
import { TransactionHistoryList } from './TransactionHistoryList';
import { LanguageType, t } from '../../i18n';
import { useTheme, ThemePalette } from '../../theme';
import {
  ChevronLeftIcon,
  StarIcon,
  DepositPlusIcon,
  WithdrawArrowIcon,
} from '../common/Icons';

export interface AssetDetailScreenProps {
  visible: boolean;
  holding: AssetHolding | null;
  currency: CurrencyType;
  privacyMode?: boolean;
  language?: LanguageType;
  onClose: () => void;
  onOpenAddTransaction: (type: TransactionType, symbol: string, platform: PlatformType) => void;
  onOpenEditTransaction?: (tx: Transaction) => void;
  allTransactions?: Transaction[];
  txRepo?: TransactionRepository;
  exchangeService?: ExchangeService;
  isFavorite?: boolean;
  onToggleFavorite?: (holding: AssetHolding) => void;
}

export const AssetDetailScreen: React.FC<AssetDetailScreenProps> = ({
  visible,
  holding,
  currency,
  privacyMode = false,
  language = 'zh',
  onClose,
  onOpenAddTransaction,
  onOpenEditTransaction,
  allTransactions,
  txRepo,
  exchangeService = defaultExchangeService,
  isFavorite: propIsFavorite,
  onToggleFavorite,
}) => {
  const isFavorite = propIsFavorite ?? holding?.isFavorite ?? false;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);

  // 加载该资产的历史交易流水 (严格限定匹配当前资产与当前平台)
  const loadTransactions = useCallback(async () => {
    if (!holding || !txRepo) return;
    try {
      const list = await txRepo.findByAssetId(holding.assetId);
      const filtered = list.filter((tx) => {
        const matchesAsset = tx.assetId === holding.assetId;
        const matchesPlatform = !holding.platform || tx.platform === holding.platform;
        return matchesAsset && matchesPlatform;
      });
      setLocalTransactions(filtered);
    } catch (err) {
      console.warn('Failed to load asset detail txs:', err);
    }
  }, [holding, txRepo]);

  useEffect(() => {
    if (visible && holding) {
      loadTransactions();
    }
  }, [visible, holding, loadTransactions]);

  const transactions = useMemo(() => {
    if (!holding) return [];
    if (allTransactions) {
      return allTransactions.filter((tx) => {
        const matchesAsset = tx.assetId === holding.assetId;
        const matchesPlatform = !holding.platform || tx.platform === holding.platform;
        return matchesAsset && matchesPlatform;
      });
    }
    return localTransactions;
  }, [allTransactions, localTransactions, holding]);

  if (!holding) return null;

  const currentPlatform: PlatformType = holding.platform || 'Binance';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        {/* 顶部导航栏 (匹配 03_asset_detail.jpg) */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
            <ChevronLeftIcon size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleCenter}>
            <Text style={styles.navTitle}>
              {holding.name} ({holding.symbol})
            </Text>
            {holding.platform && (
              <View style={styles.platformBadge}>
                <Text style={styles.platformBadgeText}>{holding.platform}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              if (onToggleFavorite && holding) {
                onToggleFavorite(holding);
              }
            }}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <StarIcon
              size={18}
              color={isFavorite ? '#FBBF24' : colors.textMuted}
              filled={isFavorite}
            />
          </TouchableOpacity>
        </View>

        {/* 页面核心滚动区域 */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. 顶部持仓价值总览卡片 (持仓市值与当前浮动盈亏) */}
          <AssetDetailHeader holding={holding} currency={currency} privacyMode={privacyMode} language={language} />

          {/* 2. 代币全周期投资战绩汇总卡片 (总盈利、已实现、累计投入与卖出) */}
          <AssetPerformanceCard
            holding={holding}
            transactions={transactions}
            currency={currency}
            privacyMode={privacyMode}
            language={language}
          />

          {/* 3. 交互式价格走势图表 (含分时切换与长按十字光标) */}
          <InteractiveChart
            symbol={holding.symbol}
            platform={currentPlatform}
            currentPrice={holding.currentPrice}
            averageCost={holding.averageCost}
            change24hPercent={holding.change24hPercent}
            currency={currency}
            exchangeService={exchangeService}
          />

          {/* 3. 历史交易明细流水 */}
          <TransactionHistoryList
            transactions={transactions}
            platform={currentPlatform}
            currentPrice={holding.currentPrice}
            averageCost={holding.averageCost}
            currency={currency}
            privacyMode={privacyMode}
            language={language}
            onPressTransaction={onOpenEditTransaction}
          />
        </ScrollView>

        {/* 底部悬浮快捷买卖操作条 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.btnBuy]}
            onPress={() => onOpenAddTransaction('BUY', holding.symbol, currentPlatform)}
            activeOpacity={0.8}
          >
            <DepositPlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.bottomBtnText}>{t('detail.buyThisToken', language)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBtn, styles.btnSell]}
            onPress={() => onOpenAddTransaction('SELL', holding.symbol, currentPlatform)}
            activeOpacity={0.8}
          >
            <WithdrawArrowIcon size={16} color="#FFFFFF" />
            <Text style={styles.bottomBtnText}>{t('detail.sellThisToken', language)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = (colors: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    navBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backArrowText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
    },
    titleCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    platformBadge: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.25)',
    },
    platformBadgeText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '700',
    },
    starIcon: {
      fontSize: 20,
      color: colors.textMuted,
    },
    starIconActive: {
      color: '#F59E0B',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 76, // 为底部吸底按钮留白
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 24 : 14,
      backgroundColor: isDark ? 'rgba(9, 13, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      borderRadius: 12,
    },
    btnBuy: {
      backgroundColor: '#10B981',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    btnSell: {
      backgroundColor: '#EF4444',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    bottomBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
  });
