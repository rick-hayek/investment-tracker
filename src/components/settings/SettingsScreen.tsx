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
  ActivityIndicator,
} from 'react-native';
import { CurrencyType, UserSettings, Asset, Transaction, Deposit, ThemeMode } from '../../domain/types';
import { CURRENCY_CONFIGS, getNextCurrency } from '../../domain/currency';
import { defaultForexService, ForexRateInfo } from '../../services/forexService';
import { DataExportService } from '../../services/dataExportService';
import { SettingsRepository } from '../../database/repositories/settingsRepository';
import { AssetRepository } from '../../database/repositories/assetRepository';
import { TransactionRepository } from '../../database/repositories/transactionRepository';
import { DepositRepository } from '../../database/repositories/depositRepository';
import { LanguageType, t, getLanguageName } from '../../i18n';
import { useTheme } from '../../theme';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BaseCurrencyIcon,
  LockIcon,
  MoonIcon,
  SunIcon,
  SystemMonitorIcon,
  GlobeIcon,
  ExportCsvIcon,
  CloudBackupIcon,
  UserAvatarIcon,
  TrashCanIcon,
  ImportExportIcon,
} from '../common/Icons';
import { CustomAlertModal, AlertType, AlertButton } from '../common/CustomAlertModal';

export interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  assets: Asset[];
  transactions: Transaction[];
  deposits?: Deposit[];
  onDataResetOrImported: () => Promise<void>;
  settingsRepo: SettingsRepository;
  assetRepo: AssetRepository;
  txRepo: TransactionRepository;
  depositRepo?: DepositRepository;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  assets,
  transactions,
  deposits = [],
  onDataResetOrImported,
  settingsRepo,
  assetRepo,
  txRepo,
  depositRepo,
}) => {
  const { colors, isDark } = useTheme();
  const [forexInfo, setForexInfo] = useState<ForexRateInfo>(defaultForexService.getRateInfo());
  const [isRefreshingForex, setIsRefreshingForex] = useState(false);

  // Backup & Import
  const [importExportModalVisible, setImportExportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // 自定义提示框状态
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    buttons: AlertButton[];
  }>({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
    buttons: [],
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
          text: t('common.confirm', lang),
          style: 'default',
        },
      ],
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (visible) {
      setForexInfo(defaultForexService.getRateInfo());
    }
  }, [visible]);

  const lang = settings.language || 'zh';

  // 主题图标与标签
  const themeIcon = React.useMemo(() => {
    switch (settings.theme) {
      case 'light':
        return <SunIcon size={20} color={colors.accent} />;
      case 'system':
        return <SystemMonitorIcon size={20} color={colors.accent} />;
      case 'dark':
      default:
        return <MoonIcon size={20} color={colors.accent} />;
    }
  }, [settings.theme, colors.accent]);

  const themeLabel = React.useMemo(() => {
    switch (settings.theme) {
      case 'light':
        return t('settings.themeLight', lang);
      case 'system':
        return t('settings.themeSystem', lang);
      case 'dark':
      default:
        return t('settings.themeDark', lang);
    }
  }, [settings.theme, lang]);

  // 轮转切换外观主题 (dark -> light -> system -> dark)
  const handleCycleTheme = () => {
    const current = settings.theme || 'dark';
    const next: ThemeMode =
      current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
    onUpdateSettings({ theme: next });
  };

  // 切换语言
  const handleToggleLanguage = () => {
    const nextLang: LanguageType = lang === 'zh' ? 'en' : 'zh';
    onUpdateSettings({ language: nextLang });
  };

  // 轮转切换基准法币
  const handleCycleCurrency = () => {
    const next = getNextCurrency(settings.baseCurrency);
    onUpdateSettings({ baseCurrency: next });
  };

  // 切换隐私模式
  const handleTogglePrivacy = (val: boolean) => {
    onUpdateSettings({ privacyMode: val });
  };

  // 导出 CSV 交易明细与出入金流水
  // 导出 CSV 到本地文件并调起系统保存面板
  const handleExportCSV = async () => {
    if (transactions.length === 0 && deposits.length === 0) {
      showAlert(
        t('common.error', lang),
        lang === 'zh' ? '暂无交易流水或本金出入金记录可导出。' : 'No transactions or deposits to export.',
        undefined,
        'warning'
      );
      return;
    }
    const currentDeposits = deposits.length > 0 ? deposits : (depositRepo ? await depositRepo.findAll() : []);
    const csvString = DataExportService.exportTransactionsToCSV(transactions, assets, currentDeposits);
    await DataExportService.exportToFile('Investment_Transactions.csv', csvString, 'text/csv');
  };

  // 导出 JSON 全量备份到本地文件并调起系统保存面板 (包含资产、交易明细与本金流水)
  const handleExportJSON = async () => {
    const currentDeposits = deposits.length > 0 ? deposits : (depositRepo ? await depositRepo.findAll() : []);
    const jsonString = DataExportService.exportToJSONBackup(assets, transactions, settings, currentDeposits);
    await DataExportService.exportToFile('InvestmentTracker_Backup.json', jsonString, 'application/json');
  };

  // 从手机本地选取文件（支持 .csv 与 .json 自动识别）
  const handleImportFile = async () => {
    setImportExportModalVisible(false);
    const pickResult = await DataExportService.pickAndReadFile('auto');
    if (!pickResult.success || !pickResult.content) {
      if (pickResult.error && pickResult.error !== '用户取消了选择') {
        showAlert(
          lang === 'zh' ? '文件选择失败' : 'File Selection Failed',
          pickResult.error,
          undefined,
          'danger'
        );
      }
      return;
    }

    const detected = DataExportService.detectAndValidateFile(pickResult.content, pickResult.filename);
    const filename = pickResult.filename || (detected.format === 'json' ? 'backup.json' : 'transactions.csv');

    if (detected.format === 'json') {
      const validation = detected.jsonResult;
      if (!validation || !validation.success || !validation.data) {
        showAlert(
          lang === 'zh' ? 'JSON 备份文件校验失败' : 'JSON Backup Validation Failed',
          detected.error || validation?.error || (lang === 'zh' ? '备份文件格式不正确' : 'Invalid backup format'),
          undefined,
          'danger'
        );
        return;
      }

      const txCount = validation.data.transactions.length;
      const assetCount = validation.data.assets.length;
      const depCount = validation.data.deposits?.length || 0;

      const summaryZh = depCount > 0
        ? `检测到备份文件，包含 ${assetCount} 个资产、${txCount} 条交易记录和 ${depCount} 笔本金充提记录。此操作将使用该备份覆盖当前数据库。`
        : `检测到备份文件，包含 ${assetCount} 个资产和 ${txCount} 条交易记录。此操作将使用该备份覆盖当前数据库。`;
      const summaryEn = depCount > 0
        ? `Detected backup with ${assetCount} assets, ${txCount} transactions and ${depCount} capital records. This will overwrite current database.`
        : `Detected backup with ${assetCount} assets and ${txCount} transactions. This will overwrite current database.`;

      showAlert(
        lang === 'zh' ? `确认从 ${filename} 恢复数据？` : `Restore from ${filename}?`,
        lang === 'zh' ? summaryZh : summaryEn,
        [
          { text: t('common.cancel', lang), style: 'cancel' },
          {
            text: t('common.confirm', lang),
            style: 'destructive',
            onPress: async () => {
              setImportLoading(true);
              try {
                await assetRepo.deleteAll();
                await txRepo.deleteAll();
                if (depositRepo) {
                  await depositRepo.deleteAll();
                }

                for (const a of validation.data!.assets) {
                  await assetRepo.insert(a);
                }
                for (const t of validation.data!.transactions) {
                  await txRepo.insert(t);
                }
                if (depositRepo && validation.data!.deposits) {
                  for (const d of validation.data!.deposits) {
                    await depositRepo.insert(d);
                  }
                }

                if (validation.data!.settings) {
                  await settingsRepo.updateSettings(validation.data!.settings);
                  onUpdateSettings(validation.data!.settings);
                }

                await onDataResetOrImported();
                showAlert(
                  t('common.success', lang),
                  lang === 'zh'
                    ? `已成功从 ${filename} 恢复数据！`
                    : `Successfully restored database from ${filename}!`,
                  undefined,
                  'success'
                );
              } catch (err: any) {
                showAlert(t('common.error', lang), err.message || 'Error restoring data', undefined, 'danger');
              } finally {
                setImportLoading(false);
              }
            },
          },
        ],
        'warning'
      );
      return;
    }

    // CSV 格式解析与处理
    const validation = detected.csvResult;
    if (!validation || !validation.success || !validation.data) {
      showAlert(
        lang === 'zh' ? '文件校验失败' : 'File Validation Failed',
        detected.error || validation?.error || (lang === 'zh' ? '文件格式不正确，无法识别为有效交易明细或备份文件' : 'Invalid file format'),
        undefined,
        'danger'
      );
      return;
    }

    const txCount = validation.data.transactions.length;
    const assetCount = validation.data.assets.length;
    const depCount = validation.data.deposits?.length || 0;

    const csvSummaryZh = depCount > 0
      ? `从文件解析出 ${assetCount} 个资产、${txCount} 条交易和 ${depCount} 笔出入金流水。将合并录入至您的本地投资组合中。`
      : `从文件解析出 ${assetCount} 个资产种类和 ${txCount} 条交易记录。将合并录入至您的本地投资组合中。`;
    const csvSummaryEn = depCount > 0
      ? `Parsed ${assetCount} assets, ${txCount} transactions and ${depCount} deposits from file. These will be added to your portfolio.`
      : `Parsed ${assetCount} assets and ${txCount} transactions from file. These will be added to your portfolio.`;

    showAlert(
      lang === 'zh' ? `确认导入文件: ${filename}？` : `Import File: ${filename}?`,
      lang === 'zh' ? csvSummaryZh : csvSummaryEn,
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        {
          text: t('common.confirm', lang),
          style: 'default',
          onPress: async () => {
            setImportLoading(true);
            try {
              for (const a of validation.data!.assets) {
                const existing = await assetRepo.findById(a.id);
                if (!existing) {
                  await assetRepo.insert(a);
                }
              }
              for (const t of validation.data!.transactions) {
                await txRepo.insert(t);
              }
              if (depositRepo && validation.data!.deposits) {
                for (const d of validation.data!.deposits) {
                  await depositRepo.insert(d);
                }
              }
              await onDataResetOrImported();
              const successMsgZh = depCount > 0
                ? `成功从 ${filename} 导入 ${txCount} 条交易与 ${depCount} 笔出入金流水！`
                : `成功从 ${filename} 导入 ${txCount} 条交易记录！`;
              const successMsgEn = depCount > 0
                ? `Successfully imported ${txCount} transactions and ${depCount} deposits from ${filename}!`
                : `Successfully imported ${txCount} transactions from ${filename}!`;
              showAlert(
                t('common.success', lang),
                lang === 'zh' ? successMsgZh : successMsgEn,
                undefined,
                'success'
              );
            } catch (err: any) {
              showAlert(t('common.error', lang), err.message || 'Error importing CSV data', undefined, 'danger');
            } finally {
              setImportLoading(false);
            }
          },
        },
      ],
      'info'
    );
  };

  // 刷新汇率
  const handleRefreshForex = async () => {
    setIsRefreshingForex(true);
    try {
      const updated = await defaultForexService.fetchLatestRates();
      setForexInfo(updated);
      showAlert(
        t('settings.rateUpdateSuccess', lang),
        `1 USD = ${updated.rates.CNY.toFixed(2)} CNY / ${updated.rates.EUR.toFixed(2)} EUR`,
        undefined,
        'success'
      );
    } catch {
      showAlert(t('common.error', lang), t('settings.rateUpdateFailed', lang), undefined, 'danger');
    } finally {
      setIsRefreshingForex(false);
    }
  };

  // 点击云端同步 (Google Drive 授权登录与状态管理)
  const handlePressCloudSync = () => {
    if (settings.cloudUser) {
      showAlert(
        t('settings.cloudSyncPlaceholderTitle', lang),
        `${t('settings.cloudSyncConnected', lang).replace('{email}', settings.cloudUser.email)}`,
        [
          { text: t('common.cancel', lang), style: 'cancel' },
          {
            text: t('settings.cloudSyncNow', lang),
            style: 'default',
            onPress: () => {
              showAlert(
                t('common.success', lang),
                t('settings.cloudSyncSuccess', lang),
                undefined,
                'success'
              );
            },
          },
          {
            text: t('settings.cloudSyncDisconnect', lang),
            style: 'destructive',
            onPress: async () => {
              await onUpdateSettings({ cloudUser: null });
              showAlert(
                t('common.success', lang),
                t('settings.cloudSyncDisconnectedSuccess', lang),
                undefined,
                'info'
              );
            },
          },
        ],
        'info'
      );
    } else {
      showAlert(
        t('settings.cloudSyncPlaceholderTitle', lang),
        t('settings.cloudSyncNotConnected', lang),
        [
          { text: t('common.cancel', lang), style: 'cancel' },
          {
            text: t('settings.cloudSyncConnectGoogle', lang),
            style: 'default',
            onPress: () => {
              showAlert(
                t('settings.cloudSyncPlaceholderTitle', lang),
                t('settings.cloudSyncNotImplemented', lang),
                undefined,
                'info'
              );
            },
          },
        ],
        'info'
      );
    }
  };

  // 清空所有本地数据
  const handleClearAllData = () => {
    showAlert(
      t('settings.clearDataConfirmTitle', lang),
      t('settings.clearDataConfirmDesc', lang),
      [
        {
          text: t('common.cancel', lang),
          style: 'cancel',
        },
        {
          text: t('settings.clearDataConfirmBtn', lang),
          style: 'destructive',
          onPress: async () => {
            try {
              await txRepo.deleteAll();
              await assetRepo.deleteAll();
              if (depositRepo) {
                await depositRepo.deleteAll();
              }
              await onDataResetOrImported();
              showAlert(t('common.success', lang), t('settings.clearDataSuccess', lang), undefined, 'success');
            } catch (err: any) {
              showAlert(t('common.error', lang), err?.message || 'Error clearing data', undefined, 'danger');
            }
          },
        },
      ],
      'danger'
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
        {/* 顶部导航栏 */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
            <ChevronLeftIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>{t('drawer.settingsAndProfile', lang)}</Text>
          <View style={styles.navRightPlaceholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* 用户只有在云端同步登录 Google Drive 之后才在原来位置显示用户信息 */}
          {settings.cloudUser ? (
            <View style={[styles.profileCard, { backgroundColor: colors.cardBackgroundSecondary, borderColor: colors.cardBorder }]}>
              <View style={styles.avatarWrapper}>
                <UserAvatarIcon size={28} color={colors.accent} />
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>
                    {settings.cloudUser.name || settings.cloudUser.email}
                  </Text>
                  <View style={styles.googleBadge}>
                    <Text style={styles.googleBadgeText}>Google Drive</Text>
                  </View>
                </View>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{settings.cloudUser.email}</Text>
              </View>
            </View>
          ) : null}

          {/* Todo: 暂时隐藏了所有通用设置项 */}

          {/* Section 1: Preferences */}
          {/* <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.preferences', lang)}</Text> */}
          {/* <View style={[styles.cardGroup, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}> */}
          {/* Base Currency */}
          {/* <TouchableOpacity style={styles.rowItem} onPress={handleCycleCurrency} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <BaseCurrencyIcon size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.baseCurrency', lang)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowRightValue, { color: colors.textSecondary }]}>
                  {settings.baseCurrency} ({CURRENCY_CONFIGS[settings.baseCurrency]?.symbol})
                </Text>
                <ChevronRightIcon size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} /> */}

          {/* Privacy Mode */}
          {/* <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <LockIcon size={20} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.privacyMode', lang)}</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{t('settings.privacyModeSubtitle', lang)}</Text>
                </View>
              </View>
              <View style={styles.switchWrapper}>
                <Switch
                  value={settings.privacyMode}
                  onValueChange={handleTogglePrivacy}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.gain }}
                  thumbColor="#F8FAFC"
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} /> */}

          {/* Language / 语言切换 */}
          {/* <TouchableOpacity style={styles.rowItem} onPress={handleToggleLanguage} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <GlobeIcon size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.language', lang)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowRightValue, { color: colors.textSecondary }]}>{getLanguageName(lang)}</Text>
                <ChevronRightIcon size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} /> */}

          {/* Theme / 主题模式 (Dark -> Light -> System -> Dark) */}
          {/* <TouchableOpacity
              style={styles.rowItem}
              onPress={handleCycleTheme}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  {themeIcon}
                </View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.theme', lang)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowRightValue, { color: colors.textSecondary }]}>{themeLabel}</Text>
                <ChevronRightIcon size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity> */}
          {/* </View> */}

          {/* Section 2: Data Management */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.dataManagement', lang)}</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            {/* 导入导出 (CSV / JSON) */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setImportExportModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <ImportExportIcon size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.importExport', lang)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowRightValue, { color: colors.textSecondary }]}>CSV, JSON</Text>
                <ChevronRightIcon size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* 云端同步 (Google Drive 授权登录与状态管理) */}
            {/* <TouchableOpacity
              style={styles.rowItem}
              onPress={handlePressCloudSync}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <CloudBackupIcon size={20} color={settings.cloudUser ? colors.accent : colors.textSecondary} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.cloudSync', lang)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowRightValue, { color: settings.cloudUser ? colors.accent : colors.textSecondary }]}>
                  {settings.cloudUser ? settings.cloudUser.email : 'Google Drive'}
                </Text>
                <ChevronRightIcon size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} /> */}

            {/* Clear All Data */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={handleClearAllData}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, styles.dangerIconContainer, { backgroundColor: colors.dangerContainer }]}>
                  <TrashCanIcon size={20} color={colors.dangerText} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, styles.dangerTitle, { color: colors.dangerText }]}>{t('settings.clearData', lang)}</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{t('settings.clearDataSubtitle', lang)}</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <ChevronRightIcon size={16} color={colors.dangerText} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 3: Forex Rates Info & Refresh */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.forexRates', lang)}</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <View style={styles.forexRow}>
              <View style={styles.forexItem}>
                <Text style={[styles.forexTag, { color: colors.textMuted }]}>USD / CNY</Text>
                <Text style={[styles.forexValue, { color: colors.textPrimary }]}>¥{forexInfo.rates.CNY.toFixed(2)}</Text>
              </View>
              <View style={[styles.forexDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.forexItem}>
                <Text style={[styles.forexTag, { color: colors.textMuted }]}>USD / EUR</Text>
                <Text style={[styles.forexValue, { color: colors.textPrimary }]}>€{forexInfo.rates.EUR.toFixed(2)}</Text>
              </View>
              <View style={[styles.forexDivider, { backgroundColor: colors.divider }]} />
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: colors.accentLight }]}
                onPress={handleRefreshForex}
                disabled={isRefreshingForex}
              >
                {isRefreshingForex ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text style={[styles.refreshBtnText, { color: colors.accent }]}>{t('settings.updateRates', lang)}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* 数据导入导出快捷操作面板 (支持 CSV 与 JSON) */}
        <Modal
          visible={importExportModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setImportExportModalVisible(false)}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: colors.modalOverlay }]}>
            <View style={[styles.modalDialog, { backgroundColor: colors.modalBackground, borderColor: colors.cardBorder }]}>
              <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{t('settings.importExportModalTitle', lang)}</Text>
              <Text style={[styles.dialogDesc, { color: colors.textSecondary }]}>
                {t('settings.importExportModalDesc', lang)}
              </Text>

              {/* 导出数据分区 */}
              <Text style={[styles.dialogSectionLabel, { color: colors.textMuted }]}>{t('settings.exportSection', lang)}</Text>
              <View style={styles.actionBtnsRow}>
                <TouchableOpacity
                  style={[styles.actionTileBtn, { backgroundColor: colors.actionTileBackground, borderColor: colors.actionTileBorder }]}
                  onPress={async () => {
                    setImportExportModalVisible(false);
                    await handleExportCSV();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionTileTitle, { color: colors.textPrimary }]}>{t('settings.exportCsvBtn', lang)}</Text>
                  <Text style={[styles.actionTileSubtitle, { color: colors.textSecondary }]}>.CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionTileBtn, { backgroundColor: colors.actionTileBackground, borderColor: colors.actionTileBorder }]}
                  onPress={async () => {
                    setImportExportModalVisible(false);
                    await handleExportJSON();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionTileTitle, { color: colors.textPrimary }]}>{t('settings.exportJsonBtn', lang)}</Text>
                  <Text style={[styles.actionTileSubtitle, { color: colors.textSecondary }]}>.JSON</Text>
                </TouchableOpacity>
              </View>

              {/* 导入数据分区 */}
              <Text style={[styles.dialogSectionLabel, { color: colors.textMuted }]}>{t('settings.importSection', lang)}</Text>
              <TouchableOpacity
                style={[styles.actionFullTileBtn, { backgroundColor: colors.actionTileBackground, borderColor: colors.actionTileBorder }]}
                onPress={async () => {
                  setImportExportModalVisible(false);
                  await handleImportFile();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionTileTitle, { color: colors.textPrimary }]}>{t('settings.importFileBtn', lang)}</Text>
                <Text style={[styles.actionTileSubtitle, { color: colors.textSecondary }]}>{t('settings.importFileSubtitle', lang)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setImportExportModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dialogCancelText, { color: colors.textSecondary }]}>{t('common.cancel', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 数据导入中遮罩 */}
        {importLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>
              {lang === 'zh' ? '正在处理数据导入...' : 'Importing data...'}
            </Text>
          </View>
        )}

        {/* 自定义暗黑质感提示框 */}
        <CustomAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
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
  navRightPlaceholder: {
    width: 36,
    height: 36,
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
  userEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  googleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  googleBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
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
  dangerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F8FAFC',
  },
  dangerTitle: {
    color: '#EF4444',
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
  connectedText: {
    color: '#38BDF8',
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
  dialogSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  actionTileBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionTileBtnPrimary: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  actionTileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  actionTileSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  actionFullTileBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  dialogCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dialogCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#F8FAFC',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
