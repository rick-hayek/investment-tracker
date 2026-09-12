import React, { useState, useEffect, useCallback } from 'react';
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
import { CURRENCY_CONFIGS } from '../../domain/currency';
import { defaultForexService, ForexRateInfo } from '../../services/forexService';
import { DataExportService } from '../../services/dataExportService';
import { SettingsRepository } from '../../database/repositories/settingsRepository';
import { AssetRepository } from '../../database/repositories/assetRepository';
import { TransactionRepository } from '../../database/repositories/transactionRepository';

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

  // JSON 导入弹窗状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // 挂载时刷新外汇汇率状态
  useEffect(() => {
    if (visible) {
      setForexInfo(defaultForexService.getRateInfo());
    }
  }, [visible]);

  // 手动刷新实时汇率
  const handleRefreshForex = async () => {
    setIsRefreshingForex(true);
    try {
      const updated = await defaultForexService.fetchLatestRates();
      setForexInfo(updated);
      Alert.alert('汇率更新成功', `最新汇率: 1 USD = ${updated.rates.CNY.toFixed(4)} CNY / ${updated.rates.EUR.toFixed(4)} EUR\n数据源: ${updated.source}`);
    } catch {
      Alert.alert('更新提示', '获取最新汇率失败，已保持当前缓存汇率。');
    } finally {
      setIsRefreshingForex(false);
    }
  };

  // 切换法币
  const handleSelectCurrency = (curr: CurrencyType) => {
    onUpdateSettings({ baseCurrency: curr });
  };

  // 切换防偷窥隐私模式
  const handleTogglePrivacy = (val: boolean) => {
    onUpdateSettings({ privacyMode: val });
  };

  // 切换切出后台高斯模糊遮罩
  const handleToggleBlur = (val: boolean) => {
    onUpdateSettings({ appSwitcherBlur: val });
  };

  // 导出 CSV 交易明细
  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert('提示', '暂无交易流水记录可导出。');
      return;
    }
    const csvString = DataExportService.exportTransactionsToCSV(transactions, assets);
    await DataExportService.shareContent('投资交易记录明细.csv', csvString);
  };

  // 导出 JSON 全量备份
  const handleExportJSON = async () => {
    const jsonString = DataExportService.exportToJSONBackup(assets, transactions, settings);
    await DataExportService.shareContent('InvestmentTracker_Backup.json', jsonString);
  };

  // 校验并执行 JSON 恢复
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
              // 清空旧数据
              const existingAssets = await assetRepo.findAll();
              for (const a of existingAssets) {
                await assetRepo.delete(a.id);
              }
              const existingTxs = await txRepo.findAll();
              for (const t of existingTxs) {
                await txRepo.delete(t.id);
              }

              // 逐条插入新数据
              for (const a of validation.data!.assets) {
                await assetRepo.insert(a);
              }
              for (const t of validation.data!.transactions) {
                await txRepo.insert(t);
              }

              // 恢复偏好设置（若存在）
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

  // 恢复出厂演示数据
  const handleResetDemoData = () => {
    Alert.alert(
      '恢复演示数据？',
      '此操作将清空当前自定义交易，并重置为系统的初始演示资产与流水。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认重置',
          style: 'destructive',
          onPress: async () => {
            const allAssets = await assetRepo.findAll();
            for (const a of allAssets) {
              await assetRepo.delete(a.id);
            }
            const allTxs = await txRepo.findAll();
            for (const t of allTxs) {
              await txRepo.delete(t.id);
            }
            await onDataResetOrImported();
            Alert.alert('完成', '已重置为初始演示数据。');
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeContainer}>
        {/* 顶部导航 */}
        <View style={styles.navBar}>
          <Text style={styles.navTitle}>设置与偏好</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Group 1: 偏好设置 */}
          <Text style={styles.sectionHeader}>偏好设置 (PREFERENCES)</Text>
          <View style={styles.card}>
            {/* 基准法币选择 */}
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>基准结算货币</Text>
                <Text style={styles.rowDesc}>全局资产看板与均价折算主单位</Text>
              </View>
              <View style={styles.currencyButtonGroup}>
                {(['USD', 'CNY', 'EUR'] as CurrencyType[]).map((curr) => {
                  const isSelected = settings.baseCurrency === curr;
                  return (
                    <TouchableOpacity
                      key={curr}
                      style={[styles.currencyBtn, isSelected && styles.currencyBtnActive]}
                      onPress={() => handleSelectCurrency(curr)}
                    >
                      <Text style={[styles.currencyBtnText, isSelected && styles.currencyBtnTextActive]}>
                        {curr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            {/* 防偷窥隐私模式 */}
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>防偷窥隐私模式</Text>
                <Text style={styles.rowDesc}>将主页估值与收益脱敏为 ••••••</Text>
              </View>
              <Switch
                value={settings.privacyMode}
                onValueChange={handleTogglePrivacy}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#F8FAFC"
              />
            </View>

            <View style={styles.divider} />

            {/* 切出后台防截屏 */}
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>多任务防截屏保护</Text>
                <Text style={styles.rowDesc}>切换至系统后台任务卡片时施加遮罩</Text>
              </View>
              <Switch
                value={settings.appSwitcherBlur}
                onValueChange={handleToggleBlur}
                trackColor={{ false: '#334155', true: '#3B82F6' }}
                thumbColor="#F8FAFC"
              />
            </View>
          </View>

          {/* Group 2: 实时法币汇率引擎 */}
          <Text style={styles.sectionHeader}>汇率引擎 (FOREX ENGINE)</Text>
          <View style={styles.card}>
            <View style={styles.forexRatesRow}>
              <View style={styles.forexRateItem}>
                <Text style={styles.forexCurrencyTag}>USD / CNY</Text>
                <Text style={styles.forexRateValue}>¥{forexInfo.rates.CNY.toFixed(2)}</Text>
              </View>
              <View style={styles.forexDividerVertical} />
              <View style={styles.forexRateItem}>
                <Text style={styles.forexCurrencyTag}>USD / EUR</Text>
                <Text style={styles.forexRateValue}>€{forexInfo.rates.EUR.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.forexFooterRow}>
              <Text style={styles.forexSourceText}>
                数据源: {forexInfo.source} • {new Date(forexInfo.lastUpdated).toLocaleTimeString()}
              </Text>
              <TouchableOpacity
                style={styles.refreshForexBtn}
                onPress={handleRefreshForex}
                disabled={isRefreshingForex}
              >
                {isRefreshingForex ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text style={styles.refreshForexText}>🔄 刷新汇率</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Group 3: 数据可携性与备份 */}
          <Text style={styles.sectionHeader}>数据管理与可携性 (DATA & BACKUP)</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={handleExportCSV} activeOpacity={0.7}>
              <Text style={styles.actionIcon}>📄</Text>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>导出交易记录 (CSV)</Text>
                <Text style={styles.actionDesc}>导出标准 CSV 表格，适配 Excel / Numbers</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionRow} onPress={handleExportJSON} activeOpacity={0.7}>
              <Text style={styles.actionIcon}>📦</Text>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>导出全量备份 (JSON)</Text>
                <Text style={styles.actionDesc}>备份所有资产档案与历史流水，便于迁移</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setImportModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>📥</Text>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>导入并恢复备份 (JSON)</Text>
                <Text style={styles.actionDesc}>粘贴或载入备份文件并执行安全校验</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionRow} onPress={handleResetDemoData} activeOpacity={0.7}>
              <Text style={styles.actionIcon}>⚠️</Text>
              <View style={styles.actionInfo}>
                <Text style={[styles.actionTitle, styles.dangerText]}>重置为演示数据</Text>
                <Text style={styles.actionDesc}>清空并重置为 BTC、ETH、SOL 初始种子流水</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Group 4: 安全锁规划说明 */}
          <Text style={styles.sectionHeader}>安全锁 (SECURITY)</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <View style={styles.titleWithBadge}>
                  <Text style={styles.rowLabel}>Face ID / 生物识别锁</Text>
                  <View style={styles.plannedBadge}>
                    <Text style={styles.plannedBadgeText}>规划中</Text>
                  </View>
                </View>
                <Text style={styles.rowDesc}>进入 App 时强制进行生物识别身份验证</Text>
              </View>
            </View>
          </View>

          {/* Group 5: 关于与版本 */}
          <Text style={styles.sectionHeader}>关于系统 (ABOUT)</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>应用名称</Text>
              <Text style={styles.aboutValue}>Investment Tracker</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>客户端版本</Text>
              <Text style={styles.aboutValue}>v1.0.0 (Expo SDK 52)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>核心架构</Text>
              <Text style={styles.aboutValue}>React Native • TypeScript • SQLite</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>本地数据库</Text>
              <Text style={[styles.aboutValue, styles.textGreen]}>● 存储就绪 (SQLite)</Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* JSON 导入弹窗 */}
        <Modal
          visible={importModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setImportModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.dialogTitle}>导入 JSON 备份</Text>
              <Text style={styles.dialogDesc}>
                请将之前导出的 JSON 备份文本粘贴到下方文本框中：
              </Text>

              <TextInput
                style={styles.dialogInput}
                placeholder='{"version": "1.0", "assets": [...], ...}'
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={8}
                value={importJsonText}
                onChangeText={setImportJsonText}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 3,
  },
  rowDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  currencyButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 3,
  },
  currencyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currencyBtnActive: {
    backgroundColor: '#3B82F6',
  },
  currencyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  currencyBtnTextActive: {
    color: '#FFFFFF',
  },
  forexRatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  forexRateItem: {
    alignItems: 'center',
  },
  forexCurrencyTag: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  forexRateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  forexDividerVertical: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  forexFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
    marginTop: 6,
  },
  forexSourceText: {
    fontSize: 11,
    color: '#64748B',
  },
  refreshForexBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  refreshForexText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 3,
  },
  actionDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionArrow: {
    fontSize: 20,
    color: '#64748B',
    marginLeft: 8,
  },
  dangerText: {
    color: '#EF4444',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plannedBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  plannedBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  textGreen: {
    color: '#10B981',
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
    backgroundColor: '#131B2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  dialogDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 18,
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
    height: 160,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogCancelBtn: {
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
