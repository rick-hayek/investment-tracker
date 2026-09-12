import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { PlatformType, TransactionType, Asset, AssetHolding, Transaction } from '../../domain/types';
import { PnLEngine } from '../../domain/calculations/pnlEngine';
import { AssetRepository } from '../../database/repositories/assetRepository';
import { TransactionRepository } from '../../database/repositories/transactionRepository';
import { ExchangeService, defaultExchangeService } from '../../services/exchangeService';
import { extractBaseSymbol, resolveCoinGeckoId, KNOWN_ASSETS } from '../../services/symbolMapper';
import { LanguageType, t } from '../../i18n';
import { CustomAlertModal, AlertType, AlertButton } from '../common/CustomAlertModal';

import {
  CloseCrossIcon,
  SearchIcon,
  LockIcon,
  ChevronDownIcon,
  TrashCanIcon,
  BtcLogo,
  EthLogo,
  SolLogo,
} from '../common/Icons';

export interface AddTransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  initialSymbol?: string;
  initialPlatform?: PlatformType;
  lockAsset?: boolean;
  holdings?: AssetHolding[];
  language?: LanguageType;
  editingTransaction?: Transaction | null;
  onClose: () => void;
  onSuccess?: () => void;
  onDeleteTransaction?: (txId: string) => Promise<void> | void;
  assetRepo?: AssetRepository;
  txRepo?: TransactionRepository;
  exchangeService?: ExchangeService;
}

const PLATFORMS: { key: PlatformType; label: string; badge: string; badgeBg: string }[] = [
  { key: 'OKX', label: 'OKX', badge: 'OK', badgeBg: '#1E293B' },
  { key: 'Binance', label: 'Binance', badge: 'B', badgeBg: '#F59E0B' },
  { key: 'CoinGecko', label: 'CoinGecko', badge: 'CG', badgeBg: '#10B981' },
  { key: 'Coinbase', label: 'Coinbase', badge: 'C', badgeBg: '#3B82F6' },
];

import { formatCurrentDateTime, parseTransactionDateTime } from '../../utils/dateUtils';
export { formatCurrentDateTime, parseTransactionDateTime };

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  initialType = 'BUY',
  initialSymbol = 'BTC',
  initialPlatform = 'Binance',
  lockAsset = false,
  holdings = [],
  language = 'zh',
  editingTransaction,
  onClose,
  onSuccess,
  onDeleteTransaction,
  assetRepo,
  txRepo,
  exchangeService = defaultExchangeService,
}) => {
  const isEditing = !!editingTransaction;
  const [txType, setTxType] = useState<TransactionType>(initialType);
  const [platform, setPlatform] = useState<PlatformType>(initialPlatform);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [priceStr, setPriceStr] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [notes, setNotes] = useState('');
  const [isHoldingDropdownOpen, setIsHoldingDropdownOpen] = useState(false);
  
  // 状态与加载指示
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [holdingQty, setHoldingQty] = useState<number>(0);

  // 现有正收益/正持仓的资产列表
  const availableHoldings = useMemo(() => {
    return (holdings || []).filter((h) => h.totalQuantity > 0);
  }, [holdings]);

  // 当前匹配的持仓对象
  const selectedHolding = useMemo(() => {
    const base = extractBaseSymbol(symbol).toLowerCase();
    const plat = platform.toLowerCase();
    const found = availableHoldings.find(
      (h) => h.symbol.toLowerCase() === base && (h.platform || 'Binance').toLowerCase() === plat
    );
    if (found) return found;
    return availableHoldings.length > 0 ? availableHoldings[0] : null;
  }, [availableHoldings, symbol, platform]);

  // 自定义优雅提示弹窗状态
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: AlertButton[],
    type: AlertType = 'warning'
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [
        {
          text: language === 'zh' ? '我知道了' : 'OK',
          style: 'default',
        },
      ],
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // 获取指定平台与代币的实时市价并填入价格输入框
  const fetchMarketPrice = useCallback(
    async (targetPlatform: PlatformType, targetSymbol: string, isManual = false) => {
      const cleanSym = targetSymbol.trim();
      if (!cleanSym) {
        if (isManual) {
          setErrorMessage(language === 'zh' ? '请先输入代币符号' : 'Please enter token symbol first');
        }
        return;
      }
      try {
        setIsFetchingPrice(true);
        if (isManual) {
          setErrorMessage(null);
        }
        setPriceNotice(null);

        const ticker = await exchangeService.fetchTicker(targetPlatform, cleanSym, true);
        setPriceStr(ticker.priceUSD.toString());

        if (ticker.isFallback) {
          setPriceNotice(
            language === 'zh'
              ? '（主平台异常，已使用 CoinGecko 现价兜底）'
              : '(Fallback to CoinGecko price)'
          );
        } else {
          setPriceNotice(null);
        }
      } catch (err: any) {
        if (isManual) {
          setErrorMessage(
            `${language === 'zh' ? '获取现价失败' : 'Failed to fetch price'}: ${err?.message || 'Network error'}`
          );
        } else {
          console.warn(`Auto fetch price error for ${cleanSym} on ${targetPlatform}:`, err);
        }
      } finally {
        setIsFetchingPrice(false);
      }
    },
    [exchangeService, language]
  );

  // 跟踪弹窗开启状态与已获取市价的代币平台组合
  const prevVisibleRef = useRef(false);
  const fetchedTokenKeyRef = useRef<string>('');

  // 1. 初始化或重置：严格仅在弹窗由隐藏(false)变为显示(true)时执行一次，不受外部行情轮询或holdings变化干扰
  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (isOpening) {
      if (editingTransaction) {
        setTxType(editingTransaction.type);
        setPlatform(editingTransaction.platform);
        const base = extractBaseSymbol(
          editingTransaction.assetId.includes('_')
            ? editingTransaction.assetId.split('_')[0]
            : editingTransaction.assetId
        ).toUpperCase();
        setSymbol(base);
        setPriceStr(editingTransaction.price.toString());
        setAmountStr(editingTransaction.amount.toString());
        setDateStr(formatCurrentDateTime(new Date(editingTransaction.timestamp)));
        setNotes(editingTransaction.notes || '');
        setErrorMessage(null);
        setPriceNotice(null);
        setIsHoldingDropdownOpen(false);

        const key = `${editingTransaction.platform}_${base}`;
        fetchedTokenKeyRef.current = key;
        return;
      }

      setTxType(initialType);
      setIsHoldingDropdownOpen(false);
      setPriceStr('');
      setAmountStr('');
      setDateStr('');
      setNotes('');
      setErrorMessage(null);
      setPriceNotice(null);

      let targetPlat = initialPlatform;
      let targetSym = initialSymbol;

      // 如果是卖出模式且未锁定资产，若当前有持仓，优先对齐现有持仓
      if (initialType === 'SELL' && !lockAsset && availableHoldings.length > 0) {
        const matched = availableHoldings.find(
          (h) => h.symbol.toLowerCase() === initialSymbol.toLowerCase() && (h.platform || 'Binance') === initialPlatform
        ) || availableHoldings[0];
        
        targetPlat = matched.platform || 'Binance';
        targetSym = matched.symbol;
        setHoldingQty(matched.totalQuantity);
      }

      setPlatform(targetPlat);
      setSymbol(targetSym);

      // 记录已获取价格的代币与平台 key，拉取一次市价
      const key = `${targetPlat}_${targetSym.trim().toUpperCase()}`;
      fetchedTokenKeyRef.current = key;
      if (targetSym.trim()) {
        fetchMarketPrice(targetPlat, targetSym.trim(), false);
      }
    }
  }, [visible, editingTransaction]);

  // 2. 当用户修改代币或平台后，自动获取当前代币在当前平台的价格一次，获取一次后不再自动更新
  useEffect(() => {
    if (!visible) return;
    const cleanSym = symbol.trim().toUpperCase();
    if (!cleanSym || cleanSym.length < 2) return;

    const currentKey = `${platform}_${cleanSym}`;
    // 如果当前代币与平台已经获取过市价，不再自动重复获取
    if (fetchedTokenKeyRef.current === currentKey) return;

    const timer = setTimeout(() => {
      fetchedTokenKeyRef.current = currentKey;
      fetchMarketPrice(platform, cleanSym, false);
    }, 500);

    return () => clearTimeout(timer);
  }, [symbol, platform, visible, fetchMarketPrice]);

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
        if (editingTransaction && t.id === editingTransaction.id) {
          continue;
        }
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
  }, [txRepo, symbol, platform, editingTransaction]);

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

  // 手动一键填充当前市价
  const handleFetchCurrentPrice = () => {
    const cleanSym = symbol.trim().toUpperCase();
    if (cleanSym) {
      fetchedTokenKeyRef.current = `${platform}_${cleanSym}`;
      fetchMarketPrice(platform, cleanSym, true);
    }
  };

  // 快捷填入当前日期时间
  const handleSetCurrentDate = () => {
    setDateStr(formatCurrentDateTime());
    if (errorMessage) setErrorMessage(null);
  };

  // 清空日期时间输入
  const handleClearDate = () => {
    setDateStr('');
    if (errorMessage) setErrorMessage(null);
  };

  // 切换买入/卖出方向
  const handleSwitchType = (type: TransactionType) => {
    setTxType(type);
    setIsHoldingDropdownOpen(false);
    if (type === 'SELL') {
      // 切换到卖出模式：如果未锁定且有持仓，自动对齐到持仓资产
      if (!lockAsset && availableHoldings.length > 0) {
        const hasCurrent = availableHoldings.some(
          (h) => h.symbol.toLowerCase() === extractBaseSymbol(symbol).toLowerCase() && (h.platform || 'Binance') === platform
        );
        if (!hasCurrent) {
          const first = availableHoldings[0];
          const plat = first.platform || 'Binance';
          setPlatform(plat);
          setSymbol(first.symbol);
          setHoldingQty(first.totalQuantity);
          fetchedTokenKeyRef.current = `${plat}_${first.symbol.trim().toUpperCase()}`;
          fetchMarketPrice(plat, first.symbol, false);
          return;
        }
      }
    }
    const cleanSym = symbol.trim().toUpperCase();
    if (cleanSym) {
      fetchedTokenKeyRef.current = `${platform}_${cleanSym}`;
      fetchMarketPrice(platform, cleanSym, false);
    }
  };

  // 切换平台：重新获取该平台的市价并自动填入一次
  const handleSelectPlatform = (newPlatform: PlatformType) => {
    setPlatform(newPlatform);
    const cleanSym = symbol.trim().toUpperCase();
    if (cleanSym) {
      fetchedTokenKeyRef.current = `${newPlatform}_${cleanSym}`;
      fetchMarketPrice(newPlatform, cleanSym, false);
    }
  };

  // 从下拉框中选择一个持仓以卖出
  const handleSelectHolding = (h: AssetHolding) => {
    const plat = h.platform || 'Binance';
    setPlatform(plat);
    setSymbol(h.symbol);
    setHoldingQty(h.totalQuantity);
    setIsHoldingDropdownOpen(false);
    setAmountStr('');
    setErrorMessage(null);
    fetchedTokenKeyRef.current = `${plat}_${h.symbol.trim().toUpperCase()}`;
    fetchMarketPrice(plat, h.symbol, false);
  };

  // 快捷全额卖出
  const handleSetMaxSell = () => {
    setAmountStr(holdingQty.toString());
  };

  // 代币 Logo 渲染
  const renderLogo = (sym: string, size = 32) => {
    const base = extractBaseSymbol(sym).toUpperCase();
    if (base === 'BTC') return <BtcLogo size={size} />;
    if (base === 'ETH') return <EthLogo size={size} />;
    if (base === 'SOL') return <SolLogo size={size} />;
    const meta = KNOWN_ASSETS[base];
    return (
      <View
        style={[
          styles.coinIconFallback,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: meta?.color || '#6366F1' },
        ]}
      >
        <Text style={styles.coinIconFallbackText}>{base.slice(0, 2)}</Text>
      </View>
    );
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

    // 校验并解析交易日期 (若留空则自动为当前时间戳)
    const dateParsed = parseTransactionDateTime(dateStr);
    if (!dateParsed.valid) {
      setErrorMessage(t('transaction.invalidDateError', language));
      return;
    }
    const finalTimestamp = dateParsed.timestamp;

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
            if (editingTransaction && t.id === editingTransaction.id) continue;
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

        showAlert(
          title,
          msg,
          [
            {
              text: language === 'zh' ? '一键全部卖出' : 'Sell Max',
              onPress: () => setAmountStr(currentHolding.toString()),
            },
            {
              text: language === 'zh' ? '我知道了' : 'OK',
              style: 'cancel',
            },
          ],
          'warning'
        );

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

      // 2. 如果提供了 TransactionRepository，插入或更新交易
      if (txRepo) {
        if (editingTransaction) {
          const updatedTx: Transaction = {
            ...editingTransaction,
            assetId,
            type: txType,
            amount: q,
            price: p,
            platform,
            timestamp: finalTimestamp,
            notes: notes.trim() || undefined,
          };
          await txRepo.update(updatedTx);
        } else {
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
            timestamp: finalTimestamp,
            notes: notes.trim() || undefined,
            createdAt: Date.now(),
          });
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(`${language === 'zh' ? '保存交易失败' : 'Failed to save transaction'}: ${err?.message || 'System error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 确认并删除交易记录
  const handleConfirmDelete = () => {
    if (!editingTransaction) return;
    showAlert(
      language === 'zh' ? '确认删除交易记录？' : 'Delete Transaction?',
      language === 'zh'
        ? '删除后该笔交易记录将无法恢复，系统将重新计算您的持仓量与成本盈亏。'
        : 'This transaction will be permanently removed and your holdings will be recalculated.',
      [
        {
          text: t('common.cancel', language),
          style: 'cancel',
        },
        {
          text: language === 'zh' ? '确认删除' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!editingTransaction || !txRepo) return;
            setIsSubmitting(true);
            try {
              if (onDeleteTransaction) {
                await onDeleteTransaction(editingTransaction.id);
              } else {
                await txRepo.delete(editingTransaction.id);
              }
              onSuccess?.();
              onClose();
            } catch (err: any) {
              setErrorMessage(
                `${language === 'zh' ? '删除交易失败' : 'Failed to delete transaction'}: ${err?.message || 'System error'}`
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
      'danger'
    );
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
            <Text style={styles.modalTitle}>
              {isEditing
                ? (language === 'zh' ? '编辑交易记录' : 'Edit Transaction')
                : t('transaction.recordTitle', language)}
            </Text>
            {isEditing ? (
              <TouchableOpacity
                onPress={handleConfirmDelete}
                style={[styles.closeBtn, styles.deleteHeaderBtn]}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <TrashCanIcon size={18} color="#EF4444" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setIsHoldingDropdownOpen(false)}
            style={{ zIndex: 1 }}
          >
            {/* 买入/卖出方向分段选择器 */}
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  isBuy && styles.toggleBtnActiveBuy,
                ]}
                onPress={() => handleSwitchType('BUY')}
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
                onPress={() => handleSwitchType('SELL')}
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

            {/* BUY 模式：首页自由选择 vs 详情页锁定持仓 */}
            {isBuy ? (
              lockAsset ? (
                /* 从具体持仓页面点击“买入”：锁定当前平台和代币 */
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>{t('transaction.targetAssetToBuy', language)}</Text>
                    <View style={styles.lockedBadge}>
                      <LockIcon size={12} color="#94A3B8" />
                      <Text style={styles.lockedBadgeText}>{t('transaction.lockedHolding', language)}</Text>
                    </View>
                  </View>
                  <View style={styles.holdingSelectorBoxLocked}>
                    <View style={styles.selectorLeft}>
                      {renderLogo(selectedHolding?.symbol || symbol, 36)}
                      <View style={styles.selectorInfo}>
                        <View style={styles.selectorTitleRow}>
                          <Text style={styles.selectorName}>
                            {selectedHolding?.name || symbol} ({extractBaseSymbol(selectedHolding?.symbol || symbol)})
                          </Text>
                          <View style={styles.platformBadge}>
                            <Text style={styles.platformBadgeText}>{platform}</Text>
                          </View>
                        </View>
                        <Text style={styles.selectorSub}>
                          {t('transaction.available', language)}: {holdingQty} {extractBaseSymbol(symbol)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                /* 从首页“记一笔”开始买入：逻辑不变，自由选择平台和代币 */
                <>
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
                            onPress={() => handleSelectPlatform(item.key)}
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

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{t('transaction.tokenSymbol', language)}</Text>
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
                </>
              )
            ) : (
              /* SELL 模式：从持仓中选择或锁定持仓 */
              <View style={[styles.formGroup, isHoldingDropdownOpen && styles.formGroupOpen]}>
                {lockAsset ? (
                  /* 从持仓详情界面进入：锁定当前持仓 */
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.formLabel}>{t('transaction.selectHoldingToSell', language)}</Text>
                      <View style={styles.lockedBadge}>
                        <LockIcon size={12} color="#94A3B8" />
                        <Text style={styles.lockedBadgeText}>{t('transaction.lockedHolding', language)}</Text>
                      </View>
                    </View>
                    <View style={styles.holdingSelectorBoxLocked}>
                      <View style={styles.selectorLeft}>
                        {renderLogo(selectedHolding?.symbol || symbol, 36)}
                        <View style={styles.selectorInfo}>
                          <View style={styles.selectorTitleRow}>
                            <Text style={styles.selectorName}>
                              {selectedHolding?.name || symbol} ({extractBaseSymbol(selectedHolding?.symbol || symbol)})
                            </Text>
                            <View style={styles.platformBadge}>
                              <Text style={styles.platformBadgeText}>{platform}</Text>
                            </View>
                          </View>
                          <Text style={styles.selectorSub}>
                            {t('transaction.available', language)}: {holdingQty} {extractBaseSymbol(symbol)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : availableHoldings.length === 0 ? (
                  /* 从首页进入但暂无可卖出持仓 */
                  <View style={styles.noHoldingsCard}>
                    <Text style={styles.noHoldingsCardText}>
                      {t('transaction.noHoldingsToSell', language)}
                    </Text>
                    <TouchableOpacity
                      style={styles.goToBuyBtn}
                      onPress={() => handleSwitchType('BUY')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.goToBuyBtnText}>{t('transaction.goToBuy', language)}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* 从首页进入：提供现有持仓下拉选择框 (图2悬浮Popover卡片效果) */
                  <>
                    <View style={styles.labelRow}>
                      <Text style={styles.formLabel}>{t('transaction.selectHoldingToSell', language)}</Text>
                      <Text style={styles.holdingInfoText}>
                        {t('transaction.available', language)}: {holdingQty} {extractBaseSymbol(symbol)}
                      </Text>
                    </View>

                    {/* 使用 selectorWrapper 紧贴持仓显示框，使悬浮卡片以 top: '100%' 悬浮在下方，零重叠 */}
                    <View style={styles.selectorWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.holdingSelectorBox,
                          isHoldingDropdownOpen && styles.holdingSelectorBoxActive,
                        ]}
                        onPress={() => setIsHoldingDropdownOpen(!isHoldingDropdownOpen)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.selectorLeft}>
                          {renderLogo(selectedHolding?.symbol || symbol, 36)}
                          <View style={styles.selectorInfo}>
                            <View style={styles.selectorTitleRow}>
                              <Text style={styles.selectorName}>
                                {selectedHolding?.name || symbol} ({extractBaseSymbol(selectedHolding?.symbol || symbol)})
                              </Text>
                              <View style={styles.platformBadge}>
                                <Text style={styles.platformBadgeText}>{selectedHolding?.platform || platform}</Text>
                              </View>
                            </View>
                            <Text style={styles.selectorSub}>
                              {t('transaction.available', language)}: {selectedHolding?.totalQuantity ?? holdingQty} {extractBaseSymbol(symbol)}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.selectorRight, isHoldingDropdownOpen && styles.selectorRightRotated]}>
                          <ChevronDownIcon size={18} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>

                      {/* 悬浮 Popover 选项列表：绝对定位紧随显示框下方 6px，顺畅点击 */}
                      {isHoldingDropdownOpen && (
                        <View style={styles.dropdownFloatingContainer}>
                          <ScrollView
                            style={styles.dropdownScroll}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="always"
                          >
                            {availableHoldings.map((item) => {
                              const itemPlat = item.platform || 'Binance';
                              const isCurrent =
                                item.symbol.toLowerCase() === symbol.toLowerCase() &&
                                itemPlat.toLowerCase() === platform.toLowerCase();
                              return (
                                <TouchableOpacity
                                  key={item.assetId}
                                  style={[styles.dropdownItem, isCurrent && styles.dropdownItemActive]}
                                  onPress={() => handleSelectHolding(item)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.selectorLeft}>
                                    {renderLogo(item.symbol, 28)}
                                    <View style={styles.selectorInfo}>
                                      <View style={styles.selectorTitleRow}>
                                        <Text style={[styles.selectorName, isCurrent && styles.textHighlight]}>
                                          {item.name} ({item.symbol})
                                        </Text>
                                        <View style={styles.platformBadge}>
                                          <Text style={styles.platformBadgeText}>{itemPlat}</Text>
                                        </View>
                                      </View>
                                    </View>
                                  </View>
                                  <View style={styles.itemRight}>
                                    <Text style={[styles.itemQtyText, isCurrent && styles.textHighlight]}>
                                      {item.totalQuantity} {item.symbol}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}

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
                onFocus={() => setIsHoldingDropdownOpen(false)}
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
                onFocus={() => setIsHoldingDropdownOpen(false)}
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

            {/* 交易日期与时间 (可选) */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.formLabel}>{t('transaction.txDate', language)}</Text>
                <View style={styles.dateActionRow}>
                  {dateStr.trim().length > 0 && (
                    <TouchableOpacity onPress={handleClearDate} style={styles.dateClearBtn}>
                      <Text style={styles.dateClearBtnText}>{language === 'zh' ? '清空' : 'Clear'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleSetCurrentDate} style={styles.quickPriceBtn}>
                    <Text style={styles.quickPriceBtnText}>{t('transaction.useCurrentTime', language)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={styles.inputBox}
                value={dateStr}
                onChangeText={(val) => {
                  setDateStr(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setIsHoldingDropdownOpen(false)}
                placeholder={t('transaction.txDatePlaceholder', language)}
                placeholderTextColor="#64748B"
              />
            </View>

            {/* 备忘备注 (UI隐藏，后续需要时解开注释即可) */}
            {/*
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
            */}

            {/* 交易总金额汇总卡片 */}
            <View style={styles.summaryBox}>
              <Text style={styles.sumLabel}>{language === 'zh' ? '交易总金额 (Total)' : 'Total Amount'}</Text>
              <Text style={styles.sumVal}>${calculatedTotal}</Text>
            </View>

            {/* 操作按钮区：编辑模式下取消与保存同一行显示，普通模式下显示确认买入/卖出 */}
            {isEditing ? (
              <View style={styles.editActionsRow}>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelEditBtnText}>
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    styles.saveEditBtnInRow,
                    { backgroundColor: themeColor },
                    isSubmitting && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {language === 'zh' ? '保存更新' : 'Save Changes'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: themeColor },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isBuy ? t('transaction.confirmBuy', language) : t('transaction.confirmSell', language)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* 自定义暗黑质感提示框 */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />
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
    overflow: 'visible',
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
    position: 'relative',
  },
  formGroupOpen: {
    zIndex: 9999,
    elevation: 30,
  },
  selectorWrapper: {
    position: 'relative',
    zIndex: 9999,
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
  dateActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateClearBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  dateClearBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
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
  deleteHeaderBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  saveEditBtnInRow: {
    flex: 1,
    marginTop: 0,
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
  // 卖出持仓选择器样式
  holdingSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 26, 43, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  holdingSelectorBoxActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  holdingSelectorBoxLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 26, 43, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorInfo: {
    flex: 1,
    gap: 3,
  },
  selectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  selectorSub: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  selectorRight: {
    paddingLeft: 8,
  },
  selectorRightRotated: {
    transform: [{ rotate: '180deg' }],
  },
  platformBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  platformBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockedBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  // 悬浮 Popover 卡片 (悬空浮动在 Trigger 正下方，带有浓郁投影与平滑内滚动)
  dropdownFloatingContainer: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: 0,
    right: 0,
    backgroundColor: '#111A2E',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.45)',
    borderRadius: 16,
    zIndex: 10000,
    elevation: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  textHighlight: {
    color: '#38BDF8',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQtyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  noHoldingsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  noHoldingsCardText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  goToBuyBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  goToBuyBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  coinIconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinIconFallbackText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
