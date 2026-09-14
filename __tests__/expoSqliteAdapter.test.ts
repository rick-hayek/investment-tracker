import { ExpoSqliteAdapter } from '../src/database/adapters/expoSqliteAdapter';
import { runMigrations, setDatabaseInstance, initializeDatabase, getDatabaseInstance } from '../src/database/db';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { TransactionRepository } from '../src/database/repositories/transactionRepository';
import { DepositRepository } from '../src/database/repositories/depositRepository';
import { SettingsRepository } from '../src/database/repositories/settingsRepository';
import { Asset, Transaction } from '../src/domain/types';

describe('ExpoSqliteAdapter (本地 SQLite 适配器测试)', () => {
  let adapter: ExpoSqliteAdapter;
  let assetRepo: AssetRepository;
  let txRepo: TransactionRepository;
  let depositRepo: DepositRepository;
  let settingsRepo: SettingsRepository;

  beforeEach(async () => {
    adapter = new ExpoSqliteAdapter('test_investment_tracker.db');
    setDatabaseInstance(adapter);
    await runMigrations(adapter);

    assetRepo = new AssetRepository(adapter);
    txRepo = new TransactionRepository(adapter);
    depositRepo = new DepositRepository(adapter);
    settingsRepo = new SettingsRepository(adapter);
  });

  afterEach(() => {
    adapter.close();
  });

  it('支持直接执行 exec, run, get, all SQL 基础接口', async () => {
    adapter.exec('CREATE TABLE IF NOT EXISTS test_table (id TEXT PRIMARY KEY, num INTEGER);');
    const runRes = adapter.run('INSERT INTO test_table (id, num) VALUES (?, ?);', ['row_1', 123]);
    expect(runRes.changes).toBe(1);

    const getRes = adapter.get<{ id: string; num: number }>('SELECT * FROM test_table WHERE id = ?;', ['row_1']);
    expect(getRes).not.toBeNull();
    expect(getRes?.id).toBe('row_1');
    expect(getRes?.num).toBe(123);

    const allRes = adapter.all<{ id: string; num: number }>('SELECT * FROM test_table;');
    expect(allRes.length).toBe(1);
    expect(allRes[0].num).toBe(123);
  });

  it('与 AssetRepository 正常集成执行增删改查', async () => {
    const asset: Asset = {
      id: 'sol_binance',
      symbol: 'SOL',
      name: 'Solana',
      platform: 'Binance',
      createdAt: 1700000000000,
    };

    await assetRepo.insert(asset);
    const found = await assetRepo.findById('sol_binance');
    expect(found).not.toBeNull();
    expect(found?.symbol).toBe('SOL');

    await assetRepo.update({ ...asset, name: 'Solana Network' });
    const updated = await assetRepo.findById('sol_binance');
    expect(updated?.name).toBe('Solana Network');

    const all = await assetRepo.findAll();
    expect(all.length).toBeGreaterThanOrEqual(1);

    await assetRepo.delete('sol_binance');
    const deleted = await assetRepo.findById('sol_binance');
    expect(deleted).toBeNull();
  });

  it('与 TransactionRepository 和 DepositRepository 正常联动', async () => {
    const asset: Asset = {
      id: 'btc_okx',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'OKX',
      createdAt: 1700000000000,
    };
    await assetRepo.insert(asset);

    const tx: Transaction = {
      id: 'tx_btc_1',
      assetId: 'btc_okx',
      type: 'BUY',
      amount: 0.5,
      price: 50000,
      fee: 2,
      feeCurrency: 'USDT',
      fundingCurrency: 'USDT',
      platform: 'OKX',
      timestamp: 1700000001000,
      createdAt: 1700000001000,
    };
    await txRepo.insert(tx);

    const txList = await txRepo.findByAssetId('btc_okx');
    expect(txList.length).toBe(1);
    expect(txList[0].amount).toBe(0.5);

    await depositRepo.insert({
      id: 'dep_1',
      type: 'DEPOSIT',
      platform: 'OKX',
      currency: 'USDT',
      amount: 30000,
      timestamp: 1700000000000,
      notes: 'Initial deposit',
      createdAt: 1700000000000,
    });

    const deposits = await depositRepo.findByPlatform('OKX');
    expect(deposits.length).toBe(1);
    expect(deposits[0].amount).toBe(30000);
  });

  it('与 SettingsRepository 正常保存与读取配置', async () => {
    await settingsRepo.updateSettings({
      baseCurrency: 'CNY',
      privacyMode: true,
    });

    const settings = await settingsRepo.getSettings();
    expect(settings.baseCurrency).toBe('CNY');
    expect(settings.privacyMode).toBe(true);
  });

  it('initializeDatabase 可正常执行全套迁移并返回实例', async () => {
    const db = await initializeDatabase();
    expect(db).toBeDefined();
    expect(getDatabaseInstance()).toBe(db);
  });
});
