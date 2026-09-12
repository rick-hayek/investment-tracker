import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { TransactionRepository } from '../src/database/repositories/transactionRepository';
import { Asset, Transaction } from '../src/domain/types';

describe('SQLite Database Repositories (本地数据存储层测试)', () => {
  let db: NodeSqliteAdapter;
  let assetRepo: AssetRepository;
  let txRepo: TransactionRepository;

  beforeEach(async () => {
    // 每次测试使用全新的内存 SQLite 实例
    db = new NodeSqliteAdapter(':memory:');
    setDatabaseInstance(db);
    await runMigrations(db);

    assetRepo = new AssetRepository(db);
    txRepo = new TransactionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('AssetRepository', () => {
    const mockAsset: Asset = {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'Binance',
      createdAt: 1700000000000,
    };

    it('成功插入并按 ID 查询资产', async () => {
      await assetRepo.insert(mockAsset);
      const found = await assetRepo.findById('btc');
      expect(found).not.toBeNull();
      expect(found?.symbol).toBe('BTC');
      expect(found?.name).toBe('Bitcoin');
      expect(found?.platform).toBe('Binance');
    });

    it('支持按 Symbol 大小写不敏感查询', async () => {
      await assetRepo.insert(mockAsset);
      const found = await assetRepo.findBySymbol('btc');
      expect(found?.id).toBe('btc');
    });

    it('更新资产信息', async () => {
      await assetRepo.insert(mockAsset);
      await assetRepo.update({
        ...mockAsset,
        name: 'Bitcoin Core',
        platform: 'OKX',
      });

      const updated = await assetRepo.findById('btc');
      expect(updated?.name).toBe('Bitcoin Core');
      expect(updated?.platform).toBe('OKX');
    });

    it('删除资产', async () => {
      await assetRepo.insert(mockAsset);
      const deleted = await assetRepo.delete('btc');
      expect(deleted).toBe(true);

      const found = await assetRepo.findById('btc');
      expect(found).toBeNull();
    });

    it('查询全部资产列表', async () => {
      await assetRepo.insert(mockAsset);
      await assetRepo.insert({
        id: 'eth',
        symbol: 'ETH',
        name: 'Ethereum',
        platform: 'OKX',
        createdAt: 1700000001000,
      });

      const all = await assetRepo.findAll();
      expect(all.length).toBe(2);
      expect(all[0].symbol).toBe('BTC');
      expect(all[1].symbol).toBe('ETH');
    });
  });

  describe('TransactionRepository', () => {
    const mockAsset: Asset = {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'Binance',
      createdAt: 1700000000000,
    };

    beforeEach(async () => {
      await assetRepo.insert(mockAsset);
    });

    it('成功记录买入与卖出交易', async () => {
      const buyTx: Transaction = {
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 64000,
        fee: 5,
        feeCurrency: 'USD',
        platform: 'Binance',
        timestamp: 1715000000000,
        notes: '定投第 1 期',
        createdAt: 1715000000000,
      };

      await txRepo.insert(buyTx);
      const found = await txRepo.findById('tx-1');
      expect(found).not.toBeNull();
      expect(found?.type).toBe('BUY');
      expect(found?.amount).toBe(0.5);
      expect(found?.price).toBe(64000);
      expect(found?.fee).toBe(5);
      expect(found?.notes).toBe('定投第 1 期');
    });

    it('按代币 ID 查询交易流水，支持按时间排序', async () => {
      await txRepo.insert({
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 60000,
        platform: 'Binance',
        timestamp: 1000,
        createdAt: 1000,
      });

      await txRepo.insert({
        id: 'tx-2',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 65000,
        platform: 'Binance',
        timestamp: 2000,
        createdAt: 2000,
      });

      const descList = await txRepo.findByAssetId('btc', 'DESC');
      expect(descList.length).toBe(2);
      expect(descList[0].id).toBe('tx-2'); // 最新在最前

      const ascList = await txRepo.findByAssetId('btc', 'ASC');
      expect(ascList[0].id).toBe('tx-1'); // 最早在最前
    });

    it('级联删除：删除资产时自动清理其所有交易流水', async () => {
      await txRepo.insert({
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 60000,
        platform: 'Binance',
        timestamp: 1000,
        createdAt: 1000,
      });

      // 删除 btc 资产
      await assetRepo.delete('btc');

      // 验证关联 transactions 已被级联清理
      const list = await txRepo.findByAssetId('btc');
      expect(list.length).toBe(0);
    });

    it('支持查询全局所有交易流水并排序', async () => {
      await txRepo.insert({
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 60000,
        platform: 'Binance',
        timestamp: 1000,
        createdAt: 1000,
      });

      await txRepo.insert({
        id: 'tx-2',
        assetId: 'btc',
        type: 'SELL',
        amount: 0.2,
        price: 65000,
        platform: 'Binance',
        timestamp: 2000,
        createdAt: 2000,
      });

      const allDesc = await txRepo.findAll('DESC');
      expect(allDesc.length).toBe(2);
      expect(allDesc[0].id).toBe('tx-2');

      const allAsc = await txRepo.findAll('ASC');
      expect(allAsc[0].id).toBe('tx-1');
    });

    it('单独删除单笔交易记录', async () => {
      await txRepo.insert({
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 60000,
        platform: 'Binance',
        timestamp: 1000,
        createdAt: 1000,
      });

      const deleted = await txRepo.delete('tx-1');
      expect(deleted).toBe(true);

      const found = await txRepo.findById('tx-1');
      expect(found).toBeNull();
    });

    it('按 assetId 批量删除交易流水', async () => {
      await txRepo.insert({
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 60000,
        platform: 'Binance',
        timestamp: 1000,
        createdAt: 1000,
      });

      const count = await txRepo.deleteByAssetId('btc');
      expect(count).toBe(1);

      const list = await txRepo.findByAssetId('btc');
      expect(list.length).toBe(0);
    });

    it('一键清空所有交易流水 (deleteAll)', async () => {
      await txRepo.insert({
        id: 'tx-1',
        assetId: 'btc',
        type: 'BUY',
        amount: 0.5,
        price: 60000,
        platform: 'Binance',
        timestamp: 1000,
        createdAt: 1000,
      });
      await txRepo.insert({
        id: 'tx-2',
        assetId: 'btc',
        type: 'BUY',
        amount: 1.0,
        price: 61000,
        platform: 'Binance',
        timestamp: 2000,
        createdAt: 2000,
      });

      await txRepo.deleteAll();
      const list = await txRepo.findAll();
      expect(list.length).toBe(0);
    });

    it('一键清空所有资产记录 (assetRepo.deleteAll)', async () => {
      await assetRepo.deleteAll();
      const all = await assetRepo.findAll();
      expect(all.length).toBe(0);
    });
  });
});

