import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AssetHolding, CurrencyType, Transaction, TransactionType, PlatformType } from '../../domain/types';
import { TransactionRepository } from '../../database/repositories/transactionRepository';
import { ExchangeService, defaultExchangeService } from '../../services/exchangeService';
import { AssetDetailHeader } from './AssetDetailHeader';
import { InteractiveChart } from '../charts/InteractiveChart';
import { TransactionHistoryList } from './TransactionHistoryList';

export interface AssetDetailScreenProps {
  visible: boolean;
  holding: AssetHolding | null;
  currency: CurrencyType;
  privacyMode?: boolean;
  onClose: () => void;
  onOpenAddTransaction: (type: TransactionType, symbol: string, platform: PlatformType) => void;
  txRepo?: TransactionRepository;
  exchangeService?: ExchangeService;
}

export const AssetDetailScreen: React.FC<AssetDetailScreenProps> = ({
  visible,
  holding,
  currency,
  privacyMode = false,
  onClose,
  onOpenAddTransaction,
  txRepo,
  exchangeService = defaultExchangeService,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 加载该资产的历史交易流水
  const loadTransactions = useCallback(async () => {
    if (!holding || !txRepo) return;
    try {
      const list = await txRepo.findByAssetId(holding.assetId);
      setTransactions(list);
    } catch {
      setTransactions([]);
    }
  }, [holding, txRepo]);

  useEffect(() => {
    if (visible && holding) {
      loadTransactions();
    }
  }, [visible, holding, loadTransactions]);

  if (!holding) return null;

  const currentPlatform = holding.platform || 'Binance';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" />

        {/* 顶部导航栏 */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.backArrowText}>←</Text>
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
            onPress={() => setIsFavorite(!isFavorite)}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.starIcon, isFavorite && styles.starIconActive]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 页面核心滚动区域 */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. 顶部持仓价值总览卡片 */}
          <AssetDetailHeader holding={holding} currency={currency} privacyMode={privacyMode} />

          {/* 2. 交互式价格走势图表 (含分时切换与长按十字光标) */}
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
            currentPrice={holding.currentPrice}
            averageCost={holding.averageCost}
            currency={currency}
          />
        </ScrollView>

        {/* 底部悬浮快捷买卖操作条 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.btnBuy]}
            onPress={() => onOpenAddTransaction('BUY', holding.symbol, currentPlatform)}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomBtnText}>➕ 买入此币</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBtn, styles.btnSell]}
            onPress={() => onOpenAddTransaction('SELL', holding.symbol, currentPlatform)}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomBtnText}>➖ 卖出记账</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navTitle: {
    color: '#F8FAFC',
    fontSize: 17,
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
  starIcon: {
    fontSize: 20,
    color: '#94A3B8',
  },
  starIconActive: {
    color: '#F59E0B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90, // 为底部吸底按钮留白
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBuy: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSell: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
