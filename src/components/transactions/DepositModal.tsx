import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from 'react-native';
import { PlatformType, DepositCurrency, Deposit, CapitalOperationType } from '../../domain/types';
import { DepositRepository } from '../../database/repositories/depositRepository';
import { PnLEngine } from '../../domain/calculations/pnlEngine';
import { LanguageType, t } from '../../i18n';
import { formatCurrentDateTime, parseTransactionDateTime } from '../../utils/dateUtils';
import { CloseCrossIcon, LockIcon, CalendarIcon, ChevronRightIcon, renderPlatformLogo } from '../common/Icons';
import { DateTimePickerModal } from '../common/DateTimePickerModal';
import { useTheme, ThemePalette } from '../../theme';

export interface DepositModalProps {
  visible: boolean;
  initialType?: CapitalOperationType;
  initialPlatform?: PlatformType;
  initialCurrency?: DepositCurrency;
  language?: LanguageType;
  platformBalances?: Record<PlatformType, { usdt: number; usdc: number; totalUSD: number }>;
  depositRepo?: DepositRepository;
  onClose: () => void;
  onSuccess?: () => void;
  enabledPlatforms?: PlatformType[];
}

const PLATFORMS: { key: PlatformType; label: string; badge: string; badgeBg: string }[] = [
  { key: 'Binance', label: 'Binance', badge: 'B', badgeBg: '#F59E0B' },
  { key: 'Coinbase', label: 'Coinbase', badge: 'C', badgeBg: '#3B82F6' },
  { key: 'CoinGecko', label: 'CoinGecko', badge: 'CG', badgeBg: '#10B981' },
  { key: 'OKX', label: 'OKX', badge: 'OK', badgeBg: '#1E293B' },
];

export const DepositModal: React.FC<DepositModalProps> = ({
  visible,
  initialType = 'DEPOSIT',
  initialPlatform = 'Binance',
  initialCurrency = 'USDT',
  language = 'zh',
  platformBalances,
  depositRepo,
  onClose,
  onSuccess,
  enabledPlatforms,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState<CapitalOperationType>(initialType);

  const displayedPlatforms = useMemo(() => {
    if (enabledPlatforms && enabledPlatforms.length > 0) {
      return PLATFORMS.filter((p) => enabledPlatforms.includes(p.key));
    }
    return PLATFORMS;
  }, [enabledPlatforms]);

  const [platform, setPlatform] = useState<PlatformType>(() => {
    if (enabledPlatforms && enabledPlatforms.length > 0 && !enabledPlatforms.includes(initialPlatform)) {
      return enabledPlatforms[0];
    }
    return initialPlatform;
  });

  const currency: DepositCurrency = 'USDT';
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 重置表单状态
  useEffect(() => {
    if (visible) {
      setActiveTab(initialType || 'DEPOSIT');
      let targetPlat = initialPlatform || 'Binance';
      if (enabledPlatforms && enabledPlatforms.length > 0 && !enabledPlatforms.includes(targetPlat)) {
        targetPlat = enabledPlatforms[0];
      }
      setPlatform(targetPlat);
      setAmountStr('');
      setDateStr('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [visible, initialType, initialPlatform, enabledPlatforms]);

  // 当可用平台发生变化且当前选中的平台不在其中时，自动调整为第一个可用平台
  useEffect(() => {
    if (displayedPlatforms.length > 0 && !displayedPlatforms.some((p) => p.key === platform)) {
      setPlatform(displayedPlatforms[0].key);
    }
  }, [displayedPlatforms, platform]);

  // 当前所选平台与币种的可用余额 (统一为 USDT)
  const currentAvailableBalance = useMemo(() => {
    if (!platformBalances) return 0;
    const platBal = platformBalances[platform];
    if (!platBal) return 0;
    return platBal.usdt ?? 0;
  }, [platformBalances, platform]);

  // 校验提现金额
  const withdrawValidation = useMemo(() => {
    if (activeTab !== 'WITHDRAW') return { valid: true, error: null };
    const num = parseFloat(amountStr);
    if (!amountStr || isNaN(num) || num <= 0) {
      return { valid: false, error: null };
    }
    return PnLEngine.validateWithdrawCapital(platform, 'USDT', num, platformBalances);
  }, [activeTab, amountStr, platform, platformBalances]);

  // 全部提现快捷填充
  const handleMaxWithdraw = () => {
    if (currentAvailableBalance > 0) {
      setAmountStr(currentAvailableBalance.toString());
      setErrorMessage(null);
    }
  };

  // 提交充值或提现流水
  const handleSubmit = async () => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      setErrorMessage(
        language === 'zh'
          ? (activeTab === 'DEPOSIT' ? '请输入有效的入金金额' : '请输入有效的出金金额')
          : (activeTab === 'DEPOSIT' ? 'Please enter a valid deposit amount' : 'Please enter a valid withdraw amount')
      );
      return;
    }

    if (activeTab === 'WITHDRAW') {
      const validation = PnLEngine.validateWithdrawCapital(platform, 'USDT', num, platformBalances);
      if (!validation.valid) {
        setErrorMessage(validation.error || t('deposit.withdrawExceed', language));
        return;
      }
    }

    let finalTimestamp = Date.now();
    if (dateStr.trim()) {
      const parsed = parseTransactionDateTime(dateStr.trim());
      if (parsed.valid) {
        finalTimestamp = parsed.timestamp;
      } else {
        setErrorMessage(t('transaction.invalidDateError', language));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (depositRepo) {
        const record: Deposit = {
          id: `cap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: activeTab,
          platform,
          currency: 'USDT',
          amount: num,
          timestamp: finalTimestamp,
          notes: notes.trim() || undefined,
          createdAt: Date.now(),
        };
        await depositRepo.insert(record);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseCrossIcon size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                  {activeTab === 'DEPOSIT' ? t('deposit.depositTitle', language) : t('deposit.withdrawTitle', language)}
                </Text>
                <View style={styles.headerPlaceholder} />
              </View>

              {/* Tabs: 充值 vs 提现 */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'DEPOSIT' && styles.tabDepositActive]}
                  onPress={() => {
                    setActiveTab('DEPOSIT');
                    setErrorMessage(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'DEPOSIT' && styles.tabDepositTextActive]}
                  >
                    {t('deposit.depositTab', language)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'WITHDRAW' && styles.tabWithdrawActive]}
                  onPress={() => {
                    setActiveTab('WITHDRAW');
                    setErrorMessage(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'WITHDRAW' && styles.tabWithdrawTextActive]}
                  >
                    {t('deposit.withdrawTab', language)}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollForm}
                contentContainerStyle={styles.scrollFormContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. 目标平台选择 */}
                {displayedPlatforms.length === 1 ? (
                  <View style={styles.singlePlatformBar}>
                    <View style={styles.singlePlatformLeft}>
                      {renderPlatformLogo(displayedPlatforms[0].key, 20)}
                      <Text style={styles.singlePlatformText}>
                        {displayedPlatforms[0].label} {language === 'zh' ? '可用:' : 'Available:'}
                      </Text>
                      <Text style={styles.singlePlatformBalanceVal}>
                        ${currentAvailableBalance.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.formLabel}>
                        {activeTab === 'DEPOSIT' ? t('deposit.targetPlatform', language) : t('deposit.withdrawTargetPlatform', language)}
                      </Text>
                      <Text style={styles.holdingInfoText}>
                        {t('deposit.currentPlatformBalance', language, { platform })}: ${currentAvailableBalance.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.platformIconRow}>
                      {displayedPlatforms.map((item) => {
                        const isSelected = platform === item.key;
                        const showName = displayedPlatforms.length <= 2;
                        const isDeposit = activeTab === 'DEPOSIT';
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={[
                              styles.platformIconCard,
                              showName && styles.platformIconCardWithName,
                              isSelected &&
                                (isDeposit
                                  ? styles.platformCardDepositSelected
                                  : styles.platformCardWithdrawSelected),
                            ]}
                            onPress={() => setPlatform(item.key)}
                            activeOpacity={0.7}
                          >
                            {renderPlatformLogo(item.key, showName ? 24 : 28)}
                            {showName && (
                              <Text
                                style={[
                                  styles.platformCardNameText,
                                  isSelected &&
                                    (isDeposit
                                      ? styles.platformCardDepositNameSelected
                                      : styles.platformCardWithdrawNameSelected),
                                ]}
                                numberOfLines={1}
                              >
                                {item.label}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 2. 充值 / 提现 金额输入 (统一为 USDT) */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>
                      {activeTab === 'DEPOSIT' ? t('deposit.depositAmount', language) : t('deposit.withdrawAmount', language)} (USDT)
                    </Text>
                    {activeTab === 'WITHDRAW' && (
                      <TouchableOpacity onPress={handleMaxWithdraw} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.maxWithdrawBtnText}>{t('deposit.maxWithdraw', language)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefix}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      value={amountStr}
                      onChangeText={(val) => {
                        setAmountStr(val);
                        setErrorMessage(null);
                      }}
                    />
                  </View>
                  {/* 提现不足提示 */}
                  {activeTab === 'WITHDRAW' && !withdrawValidation.valid && withdrawValidation.error && (
                    <Text style={styles.fieldErrorText}>{withdrawValidation.error}</Text>
                  )}
                </View>

                {/* 4. 时间 (可选) */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>{t('deposit.depositDate', language)}</Text>
                    <TouchableOpacity
                      onPress={() => setDateStr(formatCurrentDateTime(new Date()))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.currentTimeBtn}>{t('transaction.useCurrentTime', language)}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.datePickerTrigger,
                      dateStr.trim().length > 0 && styles.datePickerTriggerActive,
                    ]}
                    onPress={() => setIsDatePickerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.datePickerTriggerLeft}>
                      <CalendarIcon
                        size={18}
                        color={dateStr.trim().length > 0 ? colors.accent : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.datePickerTriggerText,
                          !dateStr.trim() && styles.datePickerTriggerPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {dateStr.trim() || t('transaction.txDatePlaceholder', language)}
                      </Text>
                    </View>
                    {dateStr.trim().length > 0 ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setDateStr('');
                        }}
                        style={styles.dateTriggerClearBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <View style={styles.clearIconCircle}>
                          <CloseCrossIcon size={12} color={colors.textSecondary} strokeWidth={2.5} />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <ChevronRightIcon size={16} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* 5. 备注 (可选) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('deposit.notes', language)}</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder={t('deposit.notesPlaceholder', language)}
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </View>

                {/* 平台资金隔离防混淆提示 */}
                <View style={styles.isolationNotice}>
                  <View style={styles.isolationIcon}>
                    <LockIcon size={14} color={colors.accent} />
                  </View>
                  <Text style={styles.isolationNoticeText}>
                    {t('deposit.platformIsolationNotice', language).replace('{platform}', platform)}
                  </Text>
                </View>

                {/* 错误提示 */}
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{errorMessage}</Text>
                  </View>
                )}
              </ScrollView>

              {/* 底部确认按钮 */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    activeTab === 'DEPOSIT' ? styles.submitDepositBtn : styles.submitWithdrawBtn,
                    (isSubmitting || (activeTab === 'WITHDRAW' && !withdrawValidation.valid && amountStr.length > 0)) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || (activeTab === 'WITHDRAW' && !withdrawValidation.valid && amountStr.length > 0)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting
                      ? t('common.loading', language)
                      : activeTab === 'DEPOSIT'
                      ? t('deposit.confirmDeposit', language)
                      : t('deposit.confirmWithdraw', language)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {/* 现代暗黑质感日期时间选择器 */}
      <DateTimePickerModal
        visible={isDatePickerOpen}
        initialValue={dateStr}
        language={language}
        onConfirm={(val) => {
          setDateStr(val);
          if (errorMessage) setErrorMessage(null);
        }}
        onClear={() => {
          setDateStr('');
          if (errorMessage) setErrorMessage(null);
        }}
        onClose={() => setIsDatePickerOpen(false)}
      />
    </Modal>
  );
};

const getStyles = (colors: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'flex-end',
    },
    modalContainer: {
      maxHeight: '90%',
      width: '100%',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingBottom: RNPlatform.OS === 'ios' ? 36 : 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    headerPlaceholder: {
      width: 36,
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: isDark ? '#1E293B' : colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 3,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
    },
    tabDepositActive: {
      backgroundColor: colors.accent,
    },
    tabWithdrawActive: {
      backgroundColor: colors.loss,
    },
    tabText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    tabDepositTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    tabWithdrawTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    scrollForm: {
      paddingHorizontal: 20,
      maxHeight: 460,
    },
    scrollFormContent: {
      paddingTop: 16,
      paddingBottom: 20,
    },
    formGroup: {
      marginBottom: 16,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    formLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
    },
    holdingInfoText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    singlePlatformBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(18, 26, 43, 0.7)' : colors.cardBackgroundSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    singlePlatformLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    singlePlatformText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    singlePlatformBalanceVal: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    maxWithdrawBtnText: {
      color: colors.loss,
      fontSize: 12,
      fontWeight: '700',
    },
    platformIconRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    platformIconCard: {
      flex: 1,
      minWidth: '22%',
      height: 52,
      borderRadius: 14,
      backgroundColor: isDark ? '#1E293B' : colors.cardBackgroundSecondary,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    platformIconCardWithName: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 8,
    },
    platformCardNameText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    platformCardDepositNameSelected: {
      color: colors.accent,
      fontWeight: '700',
    },
    platformCardWithdrawNameSelected: {
      color: colors.loss,
      fontWeight: '700',
    },
    platformCardDepositSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    platformCardWithdrawSelected: {
      borderColor: colors.loss,
      backgroundColor: colors.lossLight,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 12,
    },
    currencyChip: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : colors.cardBackgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    currencyChipDepositSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    currencyChipWithdrawSelected: {
      borderColor: colors.loss,
      backgroundColor: colors.lossLight,
    },
    currencyChipText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    currencyChipTextSelected: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 14,
    },
    inputPrefix: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
      marginRight: 6,
    },
    amountInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      paddingVertical: 12,
    },
    textInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.textPrimary,
      fontSize: 14,
    },
    notesInput: {
      height: 64,
      textAlignVertical: 'top',
    },
    currentTimeBtn: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    datePickerTrigger: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    datePickerTriggerActive: {
      borderColor: colors.accent,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : colors.cardBackground,
    },
    datePickerTriggerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    datePickerTriggerText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    datePickerTriggerPlaceholder: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '400',
    },
    dateTriggerClearBtn: {
      padding: 2,
    },
    clearIconCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fieldErrorText: {
      color: colors.loss,
      fontSize: 12,
      marginTop: 5,
    },
    isolationNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.25)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 8,
      marginTop: 4,
      marginBottom: 8,
    },
    isolationIcon: {
      marginTop: 1,
    },
    isolationNoticeText: {
      flex: 1,
      color: colors.accent,
      fontSize: 11.5,
      lineHeight: 16,
    },
    errorBox: {
      backgroundColor: colors.dangerContainer,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.25)',
      borderRadius: 10,
      padding: 10,
      marginTop: 6,
    },
    errorBoxText: {
      color: colors.dangerText,
      fontSize: 12,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    submitButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDepositBtn: {
      backgroundColor: colors.accent,
    },
    submitWithdrawBtn: {
      backgroundColor: colors.loss,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
