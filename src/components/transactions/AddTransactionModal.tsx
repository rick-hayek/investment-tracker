import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { PlatformType, TransactionType, Asset } from '../../domain/types';
import { PnLEngine } from '../../domain/calculations/pnlEngine';
import { AssetRepository } from '../../database/repositories/assetRepository';
import { TransactionRepository } from '../../database/repositories/transactionRepository';
import { ExchangeService, defaultExchangeService } from '../../services/exchangeService';
import { extractBaseSymbol, resolveCoinGeckoId, KNOWN_ASSETS } from '../../services/symbolMapper';
import { LanguageType, t } from '../../i18n';

import { CloseCrossIcon, SearchIcon } from '../common/Icons';

interface AddTransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  initialSymbol?: string;
  initialPlatform?: PlatformType;
  language?: LanguageType;
  onClose: () => void;
  onSuccess?: () => void;
  assetRepo?: AssetRepository;
  txRepo?: TransactionRepository;
  exchangeService?: ExchangeService;
}

const PLATFORMS: Array<{ key: PlatformType; label: string; badge: string; badgeBg: string }> = [
  { key: 'OKX', label: 'OKX', badge: 'OK', badgeBg: '#1E293B' },
  { key: 'Binance', label: 'Binance', badge: 'B', badgeBg: '#F3BA2F' },
  { key: 'CoinGecko', label: 'CoinGecko', badge: 'CG', badgeBg: '#8DC63F' },
  { key: 'Coinbase', label: 'Coinbase', badge: 'C', badgeBg: '#0052FF' },
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  initialType = 'BUY',
  initialSymbol = 'BTC',
  initialPlatform = 'Binance',
  language = 'zh',
  onClose,
  onSuccess,
  assetRepo,
  txRepo,
  exchangeService = defaultExchangeService,
}) => {
  const [txType, setTxType] = useState<TransactionType>(initialType);
  const [platform, setPlatform] = useState<PlatformType>(initialPlatform);
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [priceStr, setPriceStr] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // 状态标记
  const [isFetchingPrice, setIsFetchingPrice] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [holdingQty, setHoldingQty] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  // 初始化或重置
  useEffect(() => {
    if (visible) {
      setTxType(initialType);
      setPlatform(initialPlatform);
      setSymbol(initialSymbol);
      setPriceStr('');
      setAmountStr('');
      setNotes('');
      setErrorMessage(null);
      setPriceNotice(null);
    }
  }, [visible, initialType, initialSymbol, initialPlatform]);

  // 当代币改变、平台改变或切换为卖出时，计算当前该平台上的可用持仓
  const refreshHolding = useCallback(async () => {
    if (!txRepo || !symbol.trim()) {
      setHoldingQty(0);
      return 0;
    }
    try {
      const base = extractBaseSymbol(symbol);
      const targetAssetId = `${base.toLowerCase()}_${platform.toLowerCase()}`;
      
      const txs = await txRepo.findByAssetId(targetAssetId);
      let total = 0;
      for (const t of txs) {
        if (t.type === 'BUY') {
          total += t.amount;
        } else if (t.type === 'SELL') {
          total -= t.amount;
        }
      }
      const holding = Math.max(0, total);
      setHoldingQty(holding);
      return holding;
    } catch {
      setHoldingQty(0);
      return 0;
    }
  }, [txRepo, symbol, platform]);

  useEffect(() => {
    if (visible) {
      refreshHolding();
    }
  }, [visible, symbol, platform, refreshHolding]);

  // 实时检测卖出是否超卖，提供直观 UI 预警
  const parsedAmount = parseFloat(amountStr);
  const isOverselling = useMemo(() => {
    if (txType === 'BUY') return false;
    return !isNaN(parsedAmount) && parsedAmount > holdingQty;
  }, [txType, parsedAmount, holdingQty]);

  // 获取该平台的格式提示
  const formatHint = useMemo(() => {
    try {
      return exchangeService.getAdapter(platform).getFormatHint();
    } catch {
      return '💡 请输入标准代币代码';
    }
  }, [exchangeService, platform]);

  // 实时联动计算总金额
  const calculatedTotal = useMemo(() => {
    const p = parseFloat(priceStr);
    const q = parseFloat(amountStr);
    if (!isNaN(p) && !isNaN(q) && p >= 0 && q >= 0) {
      return (p * q).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return '0.00';
  }, [priceStr, amountStr]);

  // 一键填充当前市价
  const handleFetchCurrentPrice = async () => {
    if (!symbol.trim()) {
      setErrorMessage(language === 'zh' ? '请先输入代币符号' : 'Please enter token symbol first');
      return;
    }
    try {
      setIsFetchingPrice(true);
      setErrorMessage(null);
      setPriceNotice(null);

      const ticker = await exchangeService.fetchTicker(platform, symbol.trim(), true);
      setPriceStr(ticker.priceUSD.toString());

      if (ticker.isFallback) {
        setPriceNotice(language === 'zh' ? '（主平台异常，已使用 CoinGecko 现价兜底）' : '(Fallback to CoinGecko price)');
      } else {
        setPriceNotice(null);
      }
    } catch (err: any) {
      setErrorMessage(`${language === 'zh' ? '获取现价失败' : 'Failed to fetch price'}: ${err?.message || 'Network error'}`);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // 快捷全额卖出
  const handleSetMaxSell = () => {
    setAmountStr(holdingQty.toString());
  };

  // 提交交易
  const handleSubmit = async () => {
    setErrorMessage(null);
    const p = parseFloat(priceStr);
    const q = parseFloat(amountStr);

    if (!symbol.trim()) {
      setErrorMessage(language === 'zh' ? '请输入代币符号' : 'Please enter token symbol');
      return;
    }

    if (isNaN(q) || q <= 0) {
      setErrorMessage(language === 'zh' ? '交易数量必须大于 0' : 'Quantity must be greater than 0');
      return;
    }

    if (isNaN(p) || p < 0) {
      setErrorMessage(language === 'zh' ? '成交价格不能小于 0' : 'Price cannot be negative');
      return;
    }

    const baseSymbol = extractBaseSymbol(symbol);
    const assetId = `${baseSymbol.toLowerCase()}_${platform.toLowerCase()}`;

    // 针对卖出操作，执行权威实时持仓查验与优雅拦截
    if (txType === 'SELL') {
      let currentHolding = holdingQty;
      if (txRepo) {
        try {
          const freshTxs = await txRepo.findByAssetId(assetId);
          let sum = 0;
          for (const t of freshTxs) {
            if (t.type === 'BUY') sum += t.amount;
            else if (t.type === 'SELL') sum -= t.amount;
          }
          currentHolding = Math.max(0, sum);
          setHoldingQty(currentHolding);
        } catch {
          // fallback to holdingQty
        }
      }

      // 如果卖出数量超过持仓可用量，弹出优雅提示并拦截
      if (q > currentHolding) {
        const title = language === 'zh' ? '持仓不足提示' : 'Insufficient Holding';
        const msg = language === 'zh'
          ? `您在 ${platform} 当前仅持有 ${currentHolding} ${baseSymbol}，无法卖出 ${q} ${baseSymbol}。\n\n请修改卖出数量后再试。`
          : `You currently only hold ${currentHolding} ${baseSymbol} on ${platform}, cannot sell ${q} ${baseSymbol}.\n\nPlease adjust the quantity and try again.`;

        Alert.alert(title, msg, [
          {
            text: language === 'zh' ? '一键全部卖出' : 'Sell Max',
            onPress: () => setAmountStr(currentHolding.toString()),
          },
          {
            text: language === 'zh' ? '我知道了' : 'OK',
            style: 'cancel',
          },
        ]);

        setErrorMessage(
          language === 'zh'
            ? `卖出数量 (${q}) 超出当前持仓可用量 (${currentHolding} ${baseSymbol})`
            : `Sell quantity (${q}) exceeds available holding (${currentHolding} ${baseSymbol})`
        );
        return;
      }
    }

    // 防超卖与数值校验
    const validation = PnLEngine.validateTransaction(txType, q, p, holdingQty);
    if (!validation.valid) {
      setErrorMessage(validation.error || (language === 'zh' ? '输入参数有误' : 'Invalid parameters'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 如果提供了 AssetRepository，确保持仓资产记录存在 (每个平台拥有独立资产记录)
      if (assetRepo) {
        let existing = await assetRepo.findById(assetId);
        if (!existing) {
          const meta = KNOWN_ASSETS[baseSymbol];
          await assetRepo.insert({
            id: assetId,
            symbol: baseSymbol,
            name: meta ? meta.name : baseSymbol,
            platform,
            createdAt: Date.now(),
          });
        }
      }

      // 2. 如果提供了 TransactionRepository，插入交易
      if (txRepo) {
        const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await txRepo.insert({
          id: txId,
          assetId,
          type: txType,
          amount: q,
          price: p,
          fee: 0,
          feeCurrency: 'USD',
          platform,
          timestamp: Date.now(),
          notes: notes.trim() || undefined,
          createdAt: Date.now(),
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(`${language === 'zh' ? '保存交易失败' : 'Failed to save transaction'}: ${err?.message || 'System error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = txType === 'BUY';
  const themeColor = isBuy ? '#10B981' : '#EF4444';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <CloseCrossIcon size={16} color="#94A3B8" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('transaction.recordTitle', language)}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* 买入/卖出方向分段选择器 */}
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  isBuy && styles.toggleBtnActiveBuy,
                ]}
                onPress={() => setTxType('BUY')}
              >
                <Text style={[styles.toggleBtnText, isBuy && styles.toggleBtnTextActive]}>
                  {t('transaction.buy', language)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  !isBuy && styles.toggleBtnActiveSell,
                ]}
                onPress={() => setTxType('SELL')}
              >
                <Text style={[styles.toggleBtnText, !isBuy && styles.toggleBtnTextActive]}>
                  {t('transaction.sell', language)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 错误提示条 */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* 平台选择器 Chips */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('transaction.selectPlatform', language)}</Text>
              <View style={styles.platformRow}>
                {PLATFORMS.map((item) => {
                  const isSelected = platform === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.platformChip,
                        isSelected && styles.platformChipSelected,
                      ]}
                      onPress={() => setPlatform(item.key)}
                    >
                      <View style={[styles.pBadge, { backgroundColor: item.badgeBg }]}>
                        <Text style={[styles.pBadgeText, item.key === 'Binance' && { color: '#090D16' }]}>
                          {item.badge}
                        </Text>
                      </View>
                      <Text style={[styles.platformName, isSelected && styles.platformNameSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 代币符号与格式建议 */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.formLabel}>{t('transaction.tokenSymbol', language)}</Text>
                {!isBuy && (
                  <Text style={styles.holdingInfoText}>
                    {t('transaction.available', language)}: {holdingQty}
                  </Text>
                )}
              </View>
              <TextInput
                style={styles.inputBox}
                value={symbol}
                onChangeText={(val) => setSymbol(val.toUpperCase())}
                placeholder="BTC / ETH / SOL"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
              />
              <Text style={styles.helperText}>{formatHint}</Text>
            </View>

            {/* 成交单价输入与一键市价填充 */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.formLabel}>
                  {isBuy ? t('transaction.buyPrice', language) : t('transaction.sellPrice', language)} (USD)
                </Text>
                <TouchableOpacity
                  style={styles.quickPriceBtn}
                  onPress={handleFetchCurrentPrice}
                  disabled={isFetchingPrice}
                >
                  {isFetchingPrice ? (
                    <ActivityIndicator size="small" color="#38BDF8" />
                  ) : (
                    <Text style={styles.quickPriceBtnText}>{t('transaction.useMarketPrice', language)}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.inputBox}
                value={priceStr}
                onChangeText={setPriceStr}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748B"
              />
              {priceNotice && (
                <Text style={styles.fallbackNoticeText}>{priceNotice}</Text>
              )}
            </View>

            {/* 交易数量输入 */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.formLabel}>{t('transaction.quantityAmount', language)}</Text>
                {!isBuy && holdingQty > 0 && (
                  <TouchableOpacity onPress={handleSetMaxSell} style={styles.maxChip}>
                    <Text style={styles.maxChipText}>{language === 'zh' ? '全部卖出' : 'Max'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.inputBox, isOverselling && styles.inputBoxError]}
                value={amountStr}
                onChangeText={(val) => {
                  setAmountStr(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748B"
              />
              {isOverselling && (
                <View style={styles.inlineWarningRow}>
                  <Text style={styles.inlineWarningText}>
                    {language === 'zh'
                      ? `⚠️ 卖出数量 (${amountStr}) 超出可用持仓 (${holdingQty})`
                      : `⚠️ Quantity (${amountStr}) exceeds available holding (${holdingQty})`}
                  </Text>
                </View>
              )}
            </View>

            {/* 备忘备注 (可选) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('transaction.notes', language)}</Text>
              <TextInput
                style={[styles.inputBox, styles.notesBox]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('transaction.notesPlaceholder', language)}
                placeholderTextColor="#64748B"
              />
            </View>

            {/* 交易总金额汇总卡片 */}
            <View style={styles.summaryBox}>
              <Text style={styles.sumLabel}>{language === 'zh' ? '交易总金额 (Total)' : 'Total Amount'}</Text>
              <Text style={styles.sumVal}>${calculatedTotal}</Text>
            </View>

            {/* 提交按钮 */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: themeColor },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isBuy ? t('transaction.confirmBuy', language) : t('transaction.confirmSell', language)}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0E1626',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
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
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActiveBuy: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  toggleBtnActiveSell: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  toggleBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  holdingInfoText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  platformChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  platformChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  pBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  platformName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  platformNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputBox: {
    backgroundColor: 'rgba(18, 26, 43, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesBox: {
    fontSize: 13,
    paddingVertical: 10,
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  quickPriceBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  quickPriceBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackNoticeText: {
    color: '#F59E0B',
    fontSize: 11,
    marginTop: 2,
  },
  maxChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  maxChipText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sumLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  sumVal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inlineWarningRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineWarningText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
});
