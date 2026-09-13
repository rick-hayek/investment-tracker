import { DataExportService } from '../src/services/dataExportService';
import { Asset, Transaction, Deposit } from '../src/domain/types';

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

  const mockDeposits: Deposit[] = [
    {
      id: 'dep_1',
      type: 'DEPOSIT',
      platform: 'Binance',
      currency: 'USDT',
      amount: 50000,
      timestamp: 1709900000000,
      notes: 'OTC 入金',
      createdAt: 1709900000000,
    },
    {
      id: 'dep_2',
      type: 'WITHDRAW',
      platform: 'OKX',
      currency: 'USDT',
      amount: 10000,
      timestamp: 1710200000000,
      notes: '提现至冷钱包',
      createdAt: 1710200000000,
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

    it('正确导出包含本金出入金记录的 CSV', () => {
      const csv = DataExportService.exportTransactionsToCSV(mockTransactions, mockAssets, mockDeposits);
      const lines = csv.split('\n');
      expect(lines.length).toBe(5); // 1 表头 + 2 交易 + 2 出入金

      expect(lines[3]).toContain('dep_1,deposit_binance_usdt,USDT,Binance,DEPOSIT,50000,1,50000.0000,0,USDT');
      expect(lines[3]).toContain('OTC 入金');
      expect(lines[4]).toContain('dep_2,deposit_okx_usdt,USDT,OKX,WITHDRAW,10000,1,10000.0000,0,USDT');
      expect(lines[4]).toContain('提现至冷钱包');
    });

    it('无交易记录时返回空数据行但保留表头', () => {
      const csv = DataExportService.exportTransactionsToCSV([]);
      expect(csv).toBe(
        'ID,AssetID,Symbol,Platform,Type,Amount,PriceUSD,TotalUSD,Fee,FeeCurrency,Timestamp,DateTime,Notes'
      );
    });
  });

  describe('exportToJSONBackup & validateAndParseJSONBackup', () => {
    it('成功序列化并反序列化包含本金流水的 JSON 备份', () => {
      const json = DataExportService.exportToJSONBackup(
        mockAssets,
        mockTransactions,
        {
          baseCurrency: 'CNY',
          privacyMode: true,
          appSwitcherBlur: true,
          theme: 'dark',
          language: 'zh',
        },
        mockDeposits
      );

      const parsed = DataExportService.validateAndParseJSONBackup(json);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
      expect(parsed.data?.assets.length).toBe(2);
      expect(parsed.data?.transactions.length).toBe(2);
      expect(parsed.data?.deposits?.length).toBe(2);
      expect(parsed.data?.deposits?.[0].amount).toBe(50000);
      expect(parsed.data?.deposits?.[0].type).toBe('DEPOSIT');
      expect(parsed.data?.deposits?.[1].type).toBe('WITHDRAW');
      expect(parsed.data?.settings?.baseCurrency).toBe('CNY');
      expect(parsed.data?.settings?.privacyMode).toBe(true);
      expect(parsed.data?.settings?.language).toBe('zh');
    });

    it('兼容旧版无 deposits 字段的 JSON 备份', () => {
      const oldBackup = JSON.stringify({
        version: '1.0',
        exportedAt: Date.now(),
        assets: mockAssets,
        transactions: mockTransactions,
      });
      const parsed = DataExportService.validateAndParseJSONBackup(oldBackup);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.deposits).toEqual([]);
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

      const corruptedDeposit = JSON.stringify({
        assets: mockAssets,
        transactions: mockTransactions,
        deposits: [{ id: 'dep_bad' }], // 缺失 platform, amount 等
      });
      const corruptedDepResult = DataExportService.validateAndParseJSONBackup(corruptedDeposit);
      expect(corruptedDepResult.success).toBe(false);
      expect(corruptedDepResult.error).toContain('本金记录损坏');
    });
  });

  describe('parseTransactionsFromCSV', () => {
    it('成功解析导出的标准 CSV 文本并还原交易记录与资产项', () => {
      const csv = DataExportService.exportTransactionsToCSV(mockTransactions, mockAssets);
      const parsed = DataExportService.parseTransactionsFromCSV(csv);

      expect(parsed.success).toBe(true);
      expect(parsed.count).toBe(2);
      expect(parsed.data?.assets.length).toBe(2);
      expect(parsed.data?.transactions.length).toBe(2);

      const btcTx = parsed.data?.transactions.find((t) => t.amount === 0.5);
      expect(btcTx).toBeDefined();
      expect(btcTx?.type).toBe('BUY');
      expect(btcTx?.price).toBe(60000);
      expect(btcTx?.platform).toBe('Binance');
      expect(btcTx?.notes).toBe('首次建仓,分批挂单');
    });

    it('解析非标准表头但包含关键字段的 CSV 记录', () => {
      const customCSV = `Coin,Side,Qty,Rate,Exchange\nSOL,BUY,10,145.5,Manual\n`;
      const parsed = DataExportService.parseTransactionsFromCSV(customCSV);

      expect(parsed.success).toBe(true);
      expect(parsed.count).toBe(1);
      expect(parsed.data?.assets[0].symbol).toBe('SOL');
      expect(parsed.data?.transactions[0].type).toBe('BUY');
      expect(parsed.data?.transactions[0].amount).toBe(10);
      expect(parsed.data?.transactions[0].price).toBe(145.5);
    });

    it('成功解析包含 DEPOSIT 与 WITHDRAW 本金流水的 CSV 文件', () => {
      const csv = DataExportService.exportTransactionsToCSV(mockTransactions, mockAssets, mockDeposits);
      const parsed = DataExportService.parseTransactionsFromCSV(csv);

      expect(parsed.success).toBe(true);
      expect(parsed.count).toBe(4); // 2 txs + 2 deposits
      expect(parsed.data?.transactions.length).toBe(2);
      expect(parsed.data?.deposits.length).toBe(2);

      const dep1 = parsed.data?.deposits.find((d) => d.amount === 50000);
      expect(dep1).toBeDefined();
      expect(dep1?.type).toBe('DEPOSIT');
      expect(dep1?.currency).toBe('USDT');
      expect(dep1?.platform).toBe('Binance');

      const dep2 = parsed.data?.deposits.find((d) => d.amount === 10000);
      expect(dep2).toBeDefined();
      expect(dep2?.type).toBe('WITHDRAW');
      expect(dep2?.currency).toBe('USDT');
      expect(dep2?.platform).toBe('OKX');
    });

    it('对空输入或缺失必要列的 CSV 报错', () => {
      expect(DataExportService.parseTransactionsFromCSV('').success).toBe(false);
      expect(DataExportService.parseTransactionsFromCSV('Symbol,Amount\nBTC,1').success).toBe(false);
      expect(DataExportService.parseTransactionsFromCSV('Symbol,Type,Amount,Price\nBTC,UNKNOWN,1,100').success).toBe(false);
    });
  });

  describe('detectAndValidateFile', () => {
    it('自动识别并正确校验 JSON 备份文件', () => {
      const jsonContent = DataExportService.exportToJSONBackup(mockAssets, mockTransactions, {
        baseCurrency: 'USD',
        language: 'zh',
        privacyMode: false,
        appSwitcherBlur: true,
        theme: 'dark',
      });

      const result = DataExportService.detectAndValidateFile(jsonContent, 'my_backup.json');
      expect(result.format).toBe('json');
      expect(result.jsonResult?.success).toBe(true);
      expect(result.jsonResult?.data?.assets.length).toBe(2);
      expect(result.jsonResult?.data?.transactions.length).toBe(2);
    });

    it('自动识别并正确解析 CSV 交易明细文件', () => {
      const csvContent = DataExportService.exportTransactionsToCSV(mockTransactions, mockAssets);

      const result = DataExportService.detectAndValidateFile(csvContent, 'transactions.csv');
      expect(result.format).toBe('csv');
      expect(result.csvResult?.success).toBe(true);
      expect(result.csvResult?.count).toBe(2);
    });

    it('对既不是合规 CSV 也不是合规 JSON 的内容返回错误', () => {
      const result = DataExportService.detectAndValidateFile('Hello World random binary data', 'unknown.bin');
      expect(result.error).toBeDefined();
    });
  });
});
