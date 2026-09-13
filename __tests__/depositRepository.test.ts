import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { MemorySqliteAdapter } from '../src/database/adapters/memorySqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { DepositRepository } from '../src/database/repositories/depositRepository';
import { Deposit } from '../src/domain/types';

describe('DepositRepository (充值资金存储仓储测试)', () => {
  describe('基于 NodeSqliteAdapter (原生 SQLite)', () => {
    let db: NodeSqliteAdapter;
    let depositRepo: DepositRepository;

    beforeEach(async () => {
      db = new NodeSqliteAdapter(':memory:');
      setDatabaseInstance(db);
      await runMigrations(db);
      depositRepo = new DepositRepository(db);
    });

    afterEach(() => {
      db.close();
    });

    const mockDeposit: Deposit = {
      id: 'dep_1',
      platform: 'OKX',
      currency: 'USDT',
      amount: 1000,
      timestamp: 1710000000000,
      notes: 'OTC 买 U',
      createdAt: 1710000000000,
    };

    it('成功插入并根据 ID 查询充值记录', async () => {
      await depositRepo.insert(mockDeposit);
      const found = await depositRepo.findById('dep_1');
      expect(found).not.toBeNull();
      expect(found?.platform).toBe('OKX');
      expect(found?.currency).toBe('USDT');
      expect(found?.amount).toBe(1000);
      expect(found?.notes).toBe('OTC 买 U');
    });

    it('根据平台筛选充值记录 (倒序排列)', async () => {
      await depositRepo.insert(mockDeposit);
      await depositRepo.insert({
        id: 'dep_2',
        platform: 'Binance',
        currency: 'USDC',
        amount: 500,
        timestamp: 1710000001000,
        createdAt: 1710000001000,
      });
      await depositRepo.insert({
        id: 'dep_3',
        platform: 'OKX',
        currency: 'USDC',
        amount: 200,
        timestamp: 1710000002000,
        createdAt: 1710000002000,
      });

      const okxDeposits = await depositRepo.findByPlatform('OKX');
      expect(okxDeposits).toHaveLength(2);
      expect(okxDeposits[0].id).toBe('dep_3'); // 倒序排在首位
      expect(okxDeposits[1].id).toBe('dep_1');

      const binanceDeposits = await depositRepo.findByPlatform('Binance');
      expect(binanceDeposits).toHaveLength(1);
      expect(binanceDeposits[0].amount).toBe(500);
    });

    it('删除指定充值流水与全部删除', async () => {
      await depositRepo.insert(mockDeposit);
      const deleted = await depositRepo.delete('dep_1');
      expect(deleted).toBe(true);

      const found = await depositRepo.findById('dep_1');
      expect(found).toBeNull();

      await depositRepo.insert(mockDeposit);
      await depositRepo.deleteAll();
      const all = await depositRepo.findAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('基于 MemorySqliteAdapter (纯内存适配器)', () => {
    let memoryDb: MemorySqliteAdapter;
    let depositRepo: DepositRepository;

    beforeEach(() => {
      memoryDb = new MemorySqliteAdapter();
      setDatabaseInstance(memoryDb);
      depositRepo = new DepositRepository(memoryDb);
    });

    it('内存适配器正常执行插入、查询与过滤', async () => {
      const dep: Deposit = {
        id: 'mem_1',
        platform: 'Coinbase',
        currency: 'USDC',
        amount: 300,
        timestamp: 1710000000000,
        createdAt: 1710000000000,
      };
      await depositRepo.insert(dep);
      const found = await depositRepo.findById('mem_1');
      expect(found).not.toBeNull();
      expect(found?.currency).toBe('USDC');
      expect(found?.amount).toBe(300);

      const list = await depositRepo.findByPlatform('Coinbase');
      expect(list).toHaveLength(1);
    });
  });
});
