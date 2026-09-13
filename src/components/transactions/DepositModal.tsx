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
import { CloseCrossIcon, LockIcon, renderPlatformLogo } from '../common/Icons';

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
}

const PLATFORMS: { key: PlatformType; label: string; badge: string; badgeBg: string }[] = [
  { key: 'OKX', label: 'OKX', badge: 'OK', badgeBg: '#1E293B' },
  { key: 'Binance', label: 'Binance', badge: 'B', badgeBg: '#F59E0B' },
  { key: 'CoinGecko', label: 'CoinGecko', badge: 'CG', badgeBg: '#10B981' },
  { key: 'Coinbase', label: 'Coinbase', badge: 'C', badgeBg: '#3B82F6' },
];

export const DepositModal: React.FC<DepositModalProps> = ({
  visible,
  initialType = 'DEPOSIT',
  initialPlatform = 'OKX',
  initialCurrency = 'USDT',
  language = 'zh',
  platformBalances,
  depositRepo,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<CapitalOperationType>(initialType);
  const [platform, setPlatform] = useState<PlatformType>(initialPlatform);
  const currency: DepositCurrency = 'USDT';
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 重置表单状态
  useEffect(() => {
    if (visible) {
      setActiveTab(initialType || 'DEPOSIT');
      setPlatform(initialPlatform || 'OKX');
      setAmountStr('');
      setDateStr('');
      setNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [visible, initialType, initialPlatform, initialCurrency]);

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
                  <CloseCrossIcon size={20} color="#94A3B8" />
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
                    {PLATFORMS.map((item) => {
                      const isSelected = platform === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.platformIconCard,
                            isSelected &&
                              (activeTab === 'DEPOSIT'
                                ? styles.platformCardDepositSelected
                                : styles.platformCardWithdrawSelected),
                          ]}
                          onPress={() => setPlatform(item.key)}
                          activeOpacity={0.7}
                        >
                          {renderPlatformLogo(item.key, 30)}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

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
                      placeholderTextColor="#64748B"
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
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('transaction.txDatePlaceholder', language)}
                    placeholderTextColor="#64748B"
                    value={dateStr}
                    onChangeText={setDateStr}
                  />
                </View>

                {/* 5. 备注 (可选) */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('deposit.notes', language)}</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder={t('deposit.notesPlaceholder', language)}
                    placeholderTextColor="#64748B"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </View>

                {/* 平台资金隔离防混淆提示 */}
                <View style={styles.isolationNotice}>
                  <View style={styles.isolationIcon}>
                    <LockIcon size={14} color="#38BDF8" />
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

    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.82)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
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
    backgroundColor: '#1E293B',
    borderRadius: 12,
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
    backgroundColor: '#0284C7',
  },
  tabWithdrawActive: {
    backgroundColor: '#E11D48',
  },
  tabText: {
    color: '#94A3B8',
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
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  holdingInfoText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  maxWithdrawBtnText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '700',
  },
  platformIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  platformIconCard: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformCardDepositSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  platformCardWithdrawSelected: {
    borderColor: '#F43F5E',
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  currencyChipDepositSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  currencyChipWithdrawSelected: {
    borderColor: '#F43F5E',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  currencyChipText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  currencyChipTextSelected: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  inputPrefix: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 12,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#F8FAFC',
    fontSize: 14,
  },
  notesInput: {
    height: 64,
    textAlignVertical: 'top',
  },
  currentTimeBtn: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldErrorText: {
    color: '#F43F5E',
    fontSize: 12,
    marginTop: 5,
  },
  isolationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
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
    color: '#7DD3FC',
    fontSize: 11.5,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  errorBoxText: {
    color: '#FCA5A5',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDepositBtn: {
    backgroundColor: '#0284C7',
  },
  submitWithdrawBtn: {
    backgroundColor: '#E11D48',
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
