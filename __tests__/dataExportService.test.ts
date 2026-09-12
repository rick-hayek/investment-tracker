import { DataExportService } from '../src/services/dataExportService';
import { Asset, Transaction } from '../src/domain/types';

describe('DataExportService (数据可携性、CSV 导出与 JSON 备份测试)', () => {
  const mockAssets: Asset[] = [
    {
      id: 'btc_binance',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'Binance',
      createdAt: 1700000000000,
    },
    {
      id: 'eth_okx',
      symbol: 'ETH',
      name: 'Ethereum',
      platform: 'OKX',
      createdAt: 1700000000000,
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx_1',
      assetId: 'btc_binance',
      type: 'BUY',
      amount: 0.5,
      price: 60000,
      fee: 5,
      feeCurrency: 'USD',
      platform: 'Binance',
      timestamp: 1710000000000,
      notes: '首次建仓,分批挂单',
      createdAt: 1710000000000,
    },
    {
      id: 'tx_2',
      assetId: 'eth_okx',
      type: 'SELL',
      amount: 2.0,
      price: 3500,
      fee: 2,
      feeCurrency: 'USD',
      platform: 'OKX',
      timestamp: 1710100000000,
      notes: '止盈',
      createdAt: 1710100000000,
    },
  ];

  describe('exportTransactionsToCSV', () => {
    it('正确生成包含 RFC 4180 标准表头与转义的 CSV 格式', () => {
      const csv = DataExportService.exportTransactionsToCSV(mockTransactions, mockAssets);
      expect(typeof csv).toBe('string');

      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // 1 表头 + 2 数据行

      // 验证表头
      expect(lines[0]).toBe(
        'ID,AssetID,Symbol,Platform,Type,Amount,PriceUSD,TotalUSD,Fee,FeeCurrency,Timestamp,DateTime,Notes'
      );

      // 验证数据行内容与逗号转义
      expect(lines[1]).toContain('tx_1,btc_binance,BTC,Binance,BUY,0.5,60000,30000.0000,5,USD');
      expect(lines[1]).toContain('"首次建仓,分批挂单"'); // 含有逗号的内容被双引号正确包裹
      expect(lines[2]).toContain('tx_2,eth_okx,ETH,OKX,SELL,2,3500,7000.0000,2,USD');
    });

    it('无交易记录时返回空数据行但保留表头', () => {
      const csv = DataExportService.exportTransactionsToCSV([]);
      expect(csv).toBe(
        'ID,AssetID,Symbol,Platform,Type,Amount,PriceUSD,TotalUSD,Fee,FeeCurrency,Timestamp,DateTime,Notes'
      );
    });
  });

  describe('exportToJSONBackup & validateAndParseJSONBackup', () => {
    it('成功序列化并反序列化 JSON 备份', () => {
      const json = DataExportService.exportToJSONBackup(mockAssets, mockTransactions, {
        baseCurrency: 'CNY',
        privacyMode: true,
        appSwitcherBlur: true,
        theme: 'dark',
        language: 'zh',
      });

      const parsed = DataExportService.validateAndParseJSONBackup(json);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
      expect(parsed.data?.assets.length).toBe(2);
      expect(parsed.data?.transactions.length).toBe(2);
      expect(parsed.data?.settings?.baseCurrency).toBe('CNY');
      expect(parsed.data?.settings?.privacyMode).toBe(true);
      expect(parsed.data?.settings?.language).toBe('zh');
    });

    it('检测到无效或损坏的 JSON 结构时返回明确错误提示', () => {
      const invalidJsonResult = DataExportService.validateAndParseJSONBackup('not a json');
      expect(invalidJsonResult.success).toBe(false);
      expect(invalidJsonResult.error).toContain('JSON 解析失败');

      const missingArraysResult = DataExportService.validateAndParseJSONBackup('{"foo": "bar"}');
      expect(missingArraysResult.success).toBe(false);
      expect(missingArraysResult.error).toContain('缺少 assets 或 transactions');

      const corruptedAsset = JSON.stringify({
        assets: [{ id: '1' }], // 缺失 symbol, name 等
        transactions: [],
      });
      const corruptedResult = DataExportService.validateAndParseJSONBackup(corruptedAsset);
      expect(corruptedResult.success).toBe(false);
      expect(corruptedResult.error).toContain('资产数据损坏');
    });
  });
});
