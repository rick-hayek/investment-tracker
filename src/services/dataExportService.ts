import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Asset, Transaction, UserSettings, Deposit } from '../domain/types';

export interface BackupData {
  version: string;
  exportedAt: number;
  assets: Asset[];
  transactions: Transaction[];
  deposits?: Deposit[];
  settings?: UserSettings;
}

export class DataExportService {
  /**
   * 将交易流水与本金流水格式化为标准 RFC 4180 CSV 字符串
   */
  public static exportTransactionsToCSV(
    transactions: Transaction[],
    assets: Asset[] = [],
    deposits: Deposit[] = []
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

    const depositRows = deposits.map((d) => {
      const isDep = !d.type || d.type === 'DEPOSIT';
      const typeStr = isDep ? 'DEPOSIT' : 'WITHDRAW';
      const dateTime = new Date(d.timestamp).toISOString();
      return [
        escapeCSV(d.id),
        escapeCSV(`deposit_${d.platform.toLowerCase()}_${(d.currency || 'USDT').toLowerCase()}`),
        escapeCSV(d.currency || 'USDT'),
        escapeCSV(d.platform),
        escapeCSV(typeStr),
        escapeCSV(d.amount),
        escapeCSV(1),
        escapeCSV(d.amount.toFixed(4)),
        escapeCSV(0),
        escapeCSV(d.currency || 'USDT'),
        escapeCSV(d.timestamp),
        escapeCSV(dateTime),
        escapeCSV(d.notes || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows, ...depositRows].join('\n');
  }

  /**
   * 将系统核心数据（含代币持仓、交易记录与本金流水）序列化为 JSON 备份包
   */
  public static exportToJSONBackup(
    assets: Asset[],
    transactions: Transaction[],
    settings?: UserSettings,
    deposits: Deposit[] = []
  ): string {
    const backup: BackupData = {
      version: '1.0',
      exportedAt: Date.now(),
      assets,
      transactions,
      deposits,
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

      // 验证本金记录格式 (可选字段，向下兼容旧备份)
      const deposits: Deposit[] = [];
      if (parsed.deposits !== undefined) {
        if (!Array.isArray(parsed.deposits)) {
          return { success: false, error: '备份数据中 deposits 格式无效' };
        }
        for (const d of parsed.deposits) {
          if (!d.id || !d.platform || typeof d.amount !== 'number') {
            return { success: false, error: `本金记录损坏，缺失关键字段: ${JSON.stringify(d)}` };
          }
          deposits.push({
            id: d.id,
            type: d.type === 'WITHDRAW' ? 'WITHDRAW' : 'DEPOSIT',
            platform: d.platform,
            currency: d.currency || 'USDT',
            amount: d.amount,
            timestamp: Number(d.timestamp) || Date.now(),
            notes: d.notes || undefined,
            createdAt: Number(d.createdAt) || Date.now(),
          });
        }
      }

      return {
        success: true,
        data: {
          version: parsed.version || '1.0',
          exportedAt: Number(parsed.exportedAt) || Date.now(),
          assets: parsed.assets,
          transactions: parsed.transactions,
          deposits,
          settings: parsed.settings,
        },
      };
    } catch (err: any) {
      return { success: false, error: `JSON 解析失败: ${err.message}` };
    }
  }

  /**
   * 将 RFC 4180 CSV 文本切分为行与单元格
   */
  public static parseCSVRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // 跳过转义双引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * 解析并校验 CSV 交易记录，构建标准化 Asset 与 Transaction 结构
   */
  public static parseTransactionsFromCSV(csvText: string): {
    success: boolean;
    data?: {
      assets: Asset[];
      transactions: Transaction[];
      deposits: Deposit[];
    };
    error?: string;
    count?: number;
  } {
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      return { success: false, error: 'CSV 内容为空' };
    }

    const rows = this.parseCSVRows(csvText);
    if (rows.length < 2) {
      return { success: false, error: 'CSV 缺少有效表头或数据行' };
    }

    // 表头归一化索引映射
    const headerRow = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const getColIndex = (...aliases: string[]) => {
      for (const alias of aliases) {
        const idx = headerRow.findIndex((h) => h === alias);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const symbolIdx = getColIndex('symbol', 'token', 'asset', 'coin');
    const typeIdx = getColIndex('type', 'side', 'action');
    const amountIdx = getColIndex('amount', 'qty', 'quantity', 'size');
    const priceIdx = getColIndex('priceusd', 'price', 'rate', 'unitprice');

    if (symbolIdx === -1 || typeIdx === -1 || amountIdx === -1 || priceIdx === -1) {
      return {
        success: false,
        error: 'CSV 表头缺少必需列，需要包含: Symbol, Type (BUY/SELL/DEPOSIT/WITHDRAW), Amount, Price',
      };
    }

    const platformIdx = getColIndex('platform', 'exchange', 'wallet');
    const feeIdx = getColIndex('fee');
    const feeCurrencyIdx = getColIndex('feecurrency');
    const timestampIdx = getColIndex('timestamp', 'time', 'datetime', 'date');
    const notesIdx = getColIndex('notes', 'note', 'memo', 'comment');
    const idIdx = getColIndex('id', 'txid');

    const assetMap = new Map<string, Asset>();
    const transactions: Transaction[] = [];
    const deposits: Deposit[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0 || row.every((c) => !c)) continue;

      const rawSymbol = row[symbolIdx]?.trim().toUpperCase();
      if (!rawSymbol) continue;

      const rawType = row[typeIdx]?.trim().toUpperCase();
      if (rawType !== 'BUY' && rawType !== 'SELL' && rawType !== 'DEPOSIT' && rawType !== 'WITHDRAW') {
        return {
          success: false,
          error: `第 ${r + 1} 行交易类型无效: "${row[typeIdx]}"，必须为 BUY, SELL, DEPOSIT 或 WITHDRAW`,
        };
      }

      const amount = parseFloat(row[amountIdx]);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: `第 ${r + 1} 行交易数量无效: "${row[amountIdx]}"`,
        };
      }

      const price = parseFloat(row[priceIdx]);
      if (isNaN(price) || price < 0) {
        return {
          success: false,
          error: `第 ${r + 1} 行价格无效: "${row[priceIdx]}"`,
        };
      }

      const platform = (platformIdx !== -1 && row[platformIdx]?.trim()) || 'Manual';
      const fee = (feeIdx !== -1 && parseFloat(row[feeIdx])) || 0;
      const feeCurrency = (feeCurrencyIdx !== -1 && row[feeCurrencyIdx]?.trim()) || 'USD';
      const notes = (notesIdx !== -1 && row[notesIdx]?.trim()) || undefined;

      let timestamp = Date.now();
      if (timestampIdx !== -1 && row[timestampIdx]) {
        const rawTime = row[timestampIdx].trim();
        const numTime = Number(rawTime);
        if (!isNaN(numTime) && numTime > 1000000000) {
          timestamp = numTime;
        } else {
          const parsedDate = Date.parse(rawTime);
          if (!isNaN(parsedDate)) {
            timestamp = parsedDate;
          }
        }
      }

      const rowId = (idIdx !== -1 && row[idIdx]?.trim()) || `csv_${Date.now()}_${r}`;

      if (rawType === 'DEPOSIT' || rawType === 'WITHDRAW') {
        deposits.push({
          id: rowId,
          type: rawType,
          platform: platform as any,
          currency: (rawSymbol === 'USDC' ? 'USDC' : 'USDT') as any,
          amount,
          timestamp,
          notes,
          createdAt: Date.now(),
        });
      } else {
        const assetId = `${rawSymbol.toLowerCase()}_${platform.toLowerCase()}`;
        if (!assetMap.has(assetId)) {
          assetMap.set(assetId, {
            id: assetId,
            symbol: rawSymbol,
            name: rawSymbol,
            platform: platform as any,
            createdAt: Date.now(),
          });
        }

        transactions.push({
          id: rowId,
          assetId,
          type: rawType,
          amount,
          price,
          fee: isNaN(fee) ? 0 : fee,
          feeCurrency,
          platform: platform as any,
          timestamp,
          notes,
          createdAt: Date.now(),
        });
      }
    }

    if (transactions.length === 0 && deposits.length === 0) {
      return { success: false, error: '未在 CSV 中检测到有效交易或出入金记录' };
    }

    return {
      success: true,
      data: {
        assets: Array.from(assetMap.values()),
        transactions,
        deposits,
      },
      count: transactions.length + deposits.length,
    };
  }

  /**
   * 将数据直接保存为本地文件并调起系统保存/分享文件面板 (Save to Files / Share)
   */
  public static async exportToFile(
    filename: string,
    content: string,
    mimeType: string = 'text/plain'
  ): Promise<{ success: boolean; uri?: string; error?: string; savedDirectly?: boolean }> {
    try {
      // 1. Android 端优先：直接调用 StorageAccessFramework 将文件保存至手机存储 (如 Download 目录)
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        try {
          let permissions;
          try {
            const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
            permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
          } catch {
            permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          }

          if (permissions && permissions.granted && permissions.directoryUri) {
            const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              filename,
              mimeType
            );
            await FileSystem.writeAsStringAsync(safFileUri, content, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            return {
              success: true,
              uri: safFileUri,
              savedDirectly: true,
            };
          } else {
            return { success: false, error: '用户取消了选择' };
          }
        } catch (safErr: any) {
          console.warn('StorageAccessFramework save failed, falling back to Sharing:', safErr);
          // 若 SAF 失败或受限，继续回退到 cacheDirectory + Sharing
        }
      }

      // 2. iOS 或备用方案：写入本地应用目录并调起系统原生保存/分享面板
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        await this.shareContent(filename, content);
        return { success: true };
      }

      const fileUri = `${baseDir}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `保存 ${filename}`,
          UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
        });
        return { success: true, uri: fileUri };
      } else {
        await this.shareContent(filename, content);
        return { success: true, uri: fileUri };
      }
    } catch (err: any) {
      console.warn('exportToFile error:', err);
      await this.shareContent(filename, content);
      return { success: false, error: err.message };
    }
  }

  /**
   * 自动探测并解析本地文件（支持 JSON 完整备份与 CSV 交易明细）
   */
  public static detectAndValidateFile(
    content: string,
    filename?: string
  ): {
    format: 'json' | 'csv';
    jsonResult?: ReturnType<typeof DataExportService.validateAndParseJSONBackup>;
    csvResult?: ReturnType<typeof DataExportService.parseTransactionsFromCSV>;
    error?: string;
  } {
    const trimmed = (content || '').trim();
    const lowerName = (filename || '').toLowerCase();

    // 优先依据后缀名或内容特征进行探测
    const looksLikeJson = lowerName.endsWith('.json') || trimmed.startsWith('{');
    const looksLikeCsv = lowerName.endsWith('.csv') || trimmed.includes(',') || trimmed.includes('\n');

    if (looksLikeJson) {
      const jsonValidation = this.validateAndParseJSONBackup(trimmed);
      if (jsonValidation.success) {
        return { format: 'json', jsonResult: jsonValidation };
      }
      if (looksLikeCsv) {
        const csvValidation = this.parseTransactionsFromCSV(trimmed);
        if (csvValidation.success) {
          return { format: 'csv', csvResult: csvValidation };
        }
      }
      return { format: 'json', jsonResult: jsonValidation, error: jsonValidation.error };
    }

    // 尝试 CSV 解析
    const csvValidation = this.parseTransactionsFromCSV(trimmed);
    if (csvValidation.success) {
      return { format: 'csv', csvResult: csvValidation };
    }

    // 兜底尝试 JSON 解析
    const jsonValidation = this.validateAndParseJSONBackup(trimmed);
    if (jsonValidation.success) {
      return { format: 'json', jsonResult: jsonValidation };
    }

    return {
      format: 'csv',
      error: '无法识别的文件格式。请选择有效的 .csv 交易明细文件或 .json 备份文件。',
    };
  }

  /**
   * 调起系统原生文件选择器，从手机本地直接选取并读取 CSV 或 JSON 文件
   */
  public static async pickAndReadFile(
    expectedType: 'csv' | 'json' | 'auto' = 'auto'
  ): Promise<{
    success: boolean;
    content?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      let mimeTypes: string[];
      if (expectedType === 'csv') {
        mimeTypes = ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'];
      } else if (expectedType === 'json') {
        mimeTypes = ['application/json', 'text/plain', '*/*'];
      } else {
        mimeTypes = [
          'text/csv',
          'text/comma-separated-values',
          'application/json',
          'text/plain',
          'application/vnd.ms-excel',
          '*/*',
        ];
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, error: '用户取消了选择' };
      }

      const selectedAsset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(selectedAsset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return {
        success: true,
        content,
        filename: selectedAsset.name,
      };
    } catch (err: any) {
      console.warn('pickAndReadFile error:', err);
      return { success: false, error: err.message || '文件读取失败' };
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
