import { Share } from 'react-native';
import { Asset, Transaction, UserSettings } from '../domain/types';

export interface BackupData {
  version: string;
  exportedAt: number;
  assets: Asset[];
  transactions: Transaction[];
  settings?: UserSettings;
}

export class DataExportService {
  /**
   * 将交易流水格式化为标准 RFC 4180 CSV 字符串
   */
  public static exportTransactionsToCSV(
    transactions: Transaction[],
    assets: Asset[] = []
  ): string {
    const assetMap = new Map<string, Asset>();
    for (const a of assets) {
      assetMap.set(a.id, a);
    }

    const headers = [
      'ID',
      'AssetID',
      'Symbol',
      'Platform',
      'Type',
      'Amount',
      'PriceUSD',
      'TotalUSD',
      'Fee',
      'FeeCurrency',
      'Timestamp',
      'DateTime',
      'Notes',
    ];

    const escapeCSV = (str: string | number | undefined | null): string => {
      if (str === undefined || str === null) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = transactions.map((tx) => {
      const asset = assetMap.get(tx.assetId);
      const symbol = asset?.symbol || tx.assetId.split('_')[0].toUpperCase();
      const totalUSD = (tx.amount * tx.price).toFixed(4);
      const dateTime = new Date(tx.timestamp).toISOString();

      return [
        escapeCSV(tx.id),
        escapeCSV(tx.assetId),
        escapeCSV(symbol),
        escapeCSV(tx.platform),
        escapeCSV(tx.type),
        escapeCSV(tx.amount),
        escapeCSV(tx.price),
        escapeCSV(totalUSD),
        escapeCSV(tx.fee || 0),
        escapeCSV(tx.feeCurrency || 'USD'),
        escapeCSV(tx.timestamp),
        escapeCSV(dateTime),
        escapeCSV(tx.notes || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * 将系统核心数据序列化为 JSON 备份包
   */
  public static exportToJSONBackup(
    assets: Asset[],
    transactions: Transaction[],
    settings?: UserSettings
  ): string {
    const backup: BackupData = {
      version: '1.0',
      exportedAt: Date.now(),
      assets,
      transactions,
      settings,
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * 校验并反序列化导入的 JSON 备份包
   */
  public static validateAndParseJSONBackup(jsonString: string): {
    success: boolean;
    data?: BackupData;
    error?: string;
  } {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: '输入内容为空' };
      }

      const parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'JSON 格式无效' };
      }

      if (!Array.isArray(parsed.assets) || !Array.isArray(parsed.transactions)) {
        return { success: false, error: '备份数据缺少 assets 或 transactions 列表' };
      }

      // 验证资产项格式
      for (const a of parsed.assets) {
        if (!a.id || !a.symbol || !a.name || !a.platform) {
          return { success: false, error: `资产数据损坏，缺失关键字段: ${JSON.stringify(a)}` };
        }
      }

      // 验证交易项格式
      for (const t of parsed.transactions) {
        if (!t.id || !t.assetId || !t.type || typeof t.amount !== 'number' || typeof t.price !== 'number') {
          return { success: false, error: `交易记录损坏，缺失关键字段: ${JSON.stringify(t)}` };
        }
      }

      return {
        success: true,
        data: {
          version: parsed.version || '1.0',
          exportedAt: Number(parsed.exportedAt) || Date.now(),
          assets: parsed.assets,
          transactions: parsed.transactions,
          settings: parsed.settings,
        },
      };
    } catch (err: any) {
      return { success: false, error: `JSON 解析失败: ${err.message}` };
    }
  }

  /**
   * 调起系统原生分享面板（支持隔空投送、保存到文件、复制、微信等）
   */
  public static async shareContent(title: string, content: string): Promise<boolean> {
    try {
      const result = await Share.share({
        title,
        message: content,
      });
      return result.action === Share.sharedAction;
    } catch (err) {
      console.warn('Share error:', err);
      return false;
    }
  }
}
