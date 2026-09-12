import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CurrencyType, UserSettings, Asset, Transaction } from '../../domain/types';
import { CURRENCY_CONFIGS, getNextCurrency } from '../../domain/currency';
import { defaultForexService, ForexRateInfo } from '../../services/forexService';
import { DataExportService } from '../../services/dataExportService';
import { SettingsRepository } from '../../database/repositories/settingsRepository';
import { AssetRepository } from '../../database/repositories/assetRepository';
import { TransactionRepository } from '../../database/repositories/transactionRepository';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditPencilIcon,
  BaseCurrencyIcon,
  LockIcon,
  MoonIcon,
  ExportCsvIcon,
  CloudBackupIcon,
  ExchangeMatrixIcon,
  UserAvatarIcon,
} from '../common/Icons';

export interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  assets: Asset[];
  transactions: Transaction[];
  onDataResetOrImported: () => Promise<void>;
  settingsRepo: SettingsRepository;
  assetRepo: AssetRepository;
  txRepo: TransactionRepository;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  assets,
  transactions,
  onDataResetOrImported,
  settingsRepo,
  assetRepo,
  txRepo,
}) => {
  const [forexInfo, setForexInfo] = useState<ForexRateInfo>(defaultForexService.getRateInfo());
  const [isRefreshingForex, setIsRefreshingForex] = useState(false);

  // Backup & Import modal
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setForexInfo(defaultForexService.getRateInfo());
    }
  }, [visible]);

  // 轮转切换基准法币
  const handleCycleCurrency = () => {
    const next = getNextCurrency(settings.baseCurrency);
    onUpdateSettings({ baseCurrency: next });
  };

  // 切换隐私模式
  const handleTogglePrivacy = (val: boolean) => {
    onUpdateSettings({ privacyMode: val });
  };

  // 导出 CSV 交易明细
  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert('提示', '暂无交易流水记录可导出。');
      return;
    }
    const csvString = DataExportService.exportTransactionsToCSV(transactions, assets);
    await DataExportService.shareContent('Investment_Transactions.csv', csvString);
  };

  // 导出 JSON 全量备份
  const handleExportJSON = async () => {
    const jsonString = DataExportService.exportToJSONBackup(assets, transactions, settings);
    await DataExportService.shareContent('InvestmentTracker_Backup.json', jsonString);
  };

  // 确认恢复导入 JSON
  const handleConfirmImport = async () => {
    if (!importJsonText.trim()) {
      Alert.alert('错误', '请输入或粘贴 JSON 备份内容');
      return;
    }

    const validation = DataExportService.validateAndParseJSONBackup(importJsonText);
    if (!validation.success || !validation.data) {
      Alert.alert('导入失败', validation.error || '备份文件格式不正确');
      return;
    }

    Alert.alert(
      '确认恢复备份？',
      `检测到 ${validation.data.assets.length} 个资产和 ${validation.data.transactions.length} 条交易记录。恢复操作将覆盖现有记录。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定恢复',
          style: 'destructive',
          onPress: async () => {
            setImportLoading(true);
            try {
              const existingAssets = await assetRepo.findAll();
              for (const a of existingAssets) {
                await assetRepo.delete(a.id);
              }
              const existingTxs = await txRepo.findAll();
              for (const t of existingTxs) {
                await txRepo.delete(t.id);
              }

              for (const a of validation.data!.assets) {
                await assetRepo.insert(a);
              }
              for (const t of validation.data!.transactions) {
                await txRepo.insert(t);
              }

              if (validation.data!.settings) {
                await settingsRepo.updateSettings(validation.data!.settings);
                onUpdateSettings(validation.data!.settings);
              }

              await onDataResetOrImported();
              setImportModalVisible(false);
              setImportJsonText('');
              Alert.alert('成功', '数据备份已成功恢复！');
            } catch (err: any) {
              Alert.alert('导入异常', err.message || '恢复过程出错');
            } finally {
              setImportLoading(false);
            }
          },
        },
      ]
    );
  };

  // 刷新汇率
  const handleRefreshForex = async () => {
    setIsRefreshingForex(true);
    try {
      const updated = await defaultForexService.fetchLatestRates();
      setForexInfo(updated);
      Alert.alert('汇率更新成功', `1 USD = ${updated.rates.CNY.toFixed(2)} CNY / ${updated.rates.EUR.toFixed(2)} EUR`);
    } catch {
      Alert.alert('更新提示', '获取汇率失败，已保持当前缓存。');
    } finally {
      setIsRefreshingForex(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeContainer}>
        {/* 顶部导航栏 (100% 还原 05_settings_profile.jpg) */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
            <ChevronLeftIcon size={22} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Settings & Profile</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => Alert.alert('Profile', '个人资料编辑功能开发中')}
            activeOpacity={0.7}
          >
            <EditPencilIcon size={14} color="#F8FAFC" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* 用户资料主卡片 (100% 还原设计图暗黑蓝光玻璃质感) */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <UserAvatarIcon size={32} color="#94A3B8" />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>Rick H.</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>Pro Member</Text>
                </View>
              </View>
              <Text style={styles.userEmail}>rickh.invests@email.com</Text>
            </View>
          </View>

          {/* Section 1: Preferences */}
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.cardGroup}>
            {/* Base Currency */}
            <TouchableOpacity style={styles.rowItem} onPress={handleCycleCurrency} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <BaseCurrencyIcon size={20} color="#94A3B8" />
                </View>
                <Text style={styles.rowTitle}>Base Currency</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowRightValue}>
                  {settings.baseCurrency} ({CURRENCY_CONFIGS[settings.baseCurrency]?.symbol})
                </Text>
                <ChevronRightIcon size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy Mode */}
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <LockIcon size={20} color="#94A3B8" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Privacy Mode</Text>
                  <Text style={styles.rowSubtitle}>Hide Balances in Public</Text>
                </View>
              </View>
              <View style={styles.switchWrapper}>
                <Switch
                  value={settings.privacyMode}
                  onValueChange={handleTogglePrivacy}
                  trackColor={{ false: '#334155', true: '#10B981' }}
                  thumbColor="#F8FAFC"
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Theme */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => Alert.alert('Theme', '当前为原生极简深黑模式 (Dark Mode)')}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <MoonIcon size={20} color="#94A3B8" />
                </View>
                <Text style={styles.rowTitle}>Theme</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowRightValue}>Dark</Text>
                <ChevronRightIcon size={16} color="#64748B" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 2: Exchanges & Data */}
          <Text style={styles.sectionTitle}>Exchanges & Data</Text>
          <View style={styles.cardGroup}>
            {/* Connected Exchanges */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => Alert.alert('Connected Exchanges', '已连接市场数据通道: OKX, Binance, Coinbase, CoinGecko')}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <ExchangeMatrixIcon size={20} />
                </View>
                <Text style={styles.rowTitle}>Connected Exchanges</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowRightValue}>OKX, Binance</Text>
                <ChevronRightIcon size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Export Transactions (.CSV) */}
            <TouchableOpacity style={styles.rowItem} onPress={handleExportCSV} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <ExportCsvIcon size={20} color="#94A3B8" />
                </View>
                <Text style={styles.rowTitle}>Export Transactions (.CSV)</Text>
              </View>
              <View style={styles.rowRight}>
                <ChevronRightIcon size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Cloud Backup / Backup & Restore */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setBackupModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <CloudBackupIcon size={20} color="#94A3B8" />
                </View>
                <Text style={styles.rowTitle}>Cloud Backup</Text>
              </View>
              <View style={styles.rowRight}>
                <ChevronRightIcon size={16} color="#64748B" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 3: Forex Rates Info & Refresh */}
          <Text style={styles.sectionTitle}>Forex Rates</Text>
          <View style={styles.cardGroup}>
            <View style={styles.forexRow}>
              <View style={styles.forexItem}>
                <Text style={styles.forexTag}>USD / CNY</Text>
                <Text style={styles.forexValue}>¥{forexInfo.rates.CNY.toFixed(2)}</Text>
              </View>
              <View style={styles.forexDivider} />
              <View style={styles.forexItem}>
                <Text style={styles.forexTag}>USD / EUR</Text>
                <Text style={styles.forexValue}>€{forexInfo.rates.EUR.toFixed(2)}</Text>
              </View>
              <View style={styles.forexDivider} />
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={handleRefreshForex}
                disabled={isRefreshingForex}
              >
                {isRefreshingForex ? (
                  <ActivityIndicator size="small" color="#38BDF8" />
                ) : (
                  <Text style={styles.refreshBtnText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* 备份与还原快捷操作弹窗 */}
        <Modal
          visible={backupModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setBackupModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.dialogTitle}>Cloud Backup & Sync</Text>
              <Text style={styles.dialogDesc}>
                支持将持仓与交易全量导出为加密 JSON 备份包，或从文件恢复迁移。
              </Text>

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={async () => {
                  setBackupModalVisible(false);
                  await handleExportJSON();
                }}
              >
                <Text style={styles.actionBtnText}>导出全量 JSON 备份</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => {
                  setBackupModalVisible(false);
                  setImportModalVisible(true);
                }}
              >
                <Text style={styles.actionBtnSecondaryText}>导入并还原备份</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setBackupModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* JSON 导入弹窗 */}
        <Modal
          visible={importModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setImportModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.dialogTitle}>导入恢复 JSON 备份</Text>
              <Text style={styles.dialogDesc}>
                请将之前导出的 JSON 备份文本粘贴到下方文本框中：
              </Text>

              <TextInput
                style={styles.dialogInput}
                placeholder='{"version": "1.0", "assets": [...], ...}'
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={7}
                value={importJsonText}
                onChangeText={setImportJsonText}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtnSmall}
                  onPress={() => {
                    setImportModalVisible(false);
                    setImportJsonText('');
                  }}
                  disabled={importLoading}
                >
                  <Text style={styles.dialogCancelText}>取消</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogConfirmBtn, importLoading && styles.btnDisabled]}
                  onPress={handleConfirmImport}
                  disabled={importLoading}
                >
                  {importLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogConfirmText}>校验并恢复</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151D2F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#202B42',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  proBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  userEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#131B2D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F8FAFC',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#8E9BAE',
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowRightValue: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  switchWrapper: {
    transform: [{ scale: 0.85 }],
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  forexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  forexItem: {
    alignItems: 'center',
    flex: 1,
  },
  forexTag: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  forexValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  forexDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  refreshBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  bottomSpacer: {
    height: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    width: '100%',
    backgroundColor: '#131B2D',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 22,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  dialogDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 18,
    lineHeight: 18,
  },
  actionBtnPrimary: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtnSecondaryText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  dialogCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dialogCancelBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  dialogCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  dialogInput: {
    backgroundColor: '#090D16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  dialogConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
