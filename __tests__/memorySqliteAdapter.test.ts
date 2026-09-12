import { MemorySqliteAdapter } from '../src/database/adapters/memorySqliteAdapter';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { TransactionRepository } from '../src/database/repositories/transactionRepository';
import { SettingsRepository } from '../src/database/repositories/settingsRepository';

describe('MemorySqliteAdapter (内存数据库适配器测试)', () => {
  let memDb: MemorySqliteAdapter;
  let assetRepo: AssetRepository;
  let txRepo: TransactionRepository;
  let settingsRepo: SettingsRepository;

  beforeEach(() => {
    memDb = new MemorySqliteAdapter();
    assetRepo = new AssetRepository(memDb);
    txRepo = new TransactionRepository(memDb);
    settingsRepo = new SettingsRepository(memDb);
  });

  it('支持插入、读取资产并在清空时完全清除', async () => {
    await assetRepo.insert({
      id: 'btc_binance',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'Binance',
      createdAt: 1000,
    });
    await assetRepo.insert({
      id: 'eth_okx',
      symbol: 'ETH',
      name: 'Ethereum',
      platform: 'OKX',
      createdAt: 1000,
    });

    let assets = await assetRepo.findAll();
    expect(assets.length).toBe(2);

    await assetRepo.deleteAll();
    assets = await assetRepo.findAll();
    expect(assets.length).toBe(0);
  });

  it('支持插入、读取交易并在清空时完全清除', async () => {
    await txRepo.insert({
      id: 'tx_1',
      assetId: 'btc_binance',
      type: 'BUY',
      amount: 1.0,
      price: 60000,
      platform: 'Binance',
      timestamp: 1000,
      createdAt: 1000,
    });

    let txs = await txRepo.findAll();
    expect(txs.length).toBe(1);

    await txRepo.deleteAll();
    txs = await txRepo.findAll();
    expect(txs.length).toBe(0);
  });

  it('支持设置键值持久化与读取', async () => {
    expect(await settingsRepo.getRawValue('initial_seed_done')).toBeNull();

    await settingsRepo.setRawValue('initial_seed_done', 'true');
    expect(await settingsRepo.getRawValue('initial_seed_done')).toBe('true');

    await settingsRepo.updateSettings({ baseCurrency: 'EUR' });
    const updated = await settingsRepo.getSettings();
    expect(updated.baseCurrency).toBe('EUR');
  });

  it('findByAssetId 严格按 assetId 隔离不同平台的交易，不返回其他平台的交易', async () => {
    // 插入 OKX 平台的 BTC 交易
    await txRepo.insert({
      id: 'tx_okx_1',
      assetId: 'btc_okx',
      type: 'BUY',
      amount: 2.0,
      price: 77000,
      platform: 'OKX',
      timestamp: 1000,
      createdAt: 1000,
    });

    // 插入 Binance 平台的 BTC 交易
    await txRepo.insert({
      id: 'tx_binance_1',
      assetId: 'btc_binance',
      type: 'BUY',
      amount: 1.0,
      price: 77000,
      platform: 'Binance',
      timestamp: 2000,
      createdAt: 2000,
    });

    const okxTxs = await txRepo.findByAssetId('btc_okx');
    expect(okxTxs.length).toBe(1);
    expect(okxTxs[0].id).toBe('tx_okx_1');
    expect(okxTxs[0].platform).toBe('OKX');

    const binanceTxs = await txRepo.findByAssetId('btc_binance');
    expect(binanceTxs.length).toBe(1);
    expect(binanceTxs[0].id).toBe('tx_binance_1');
    expect(binanceTxs[0].platform).toBe('Binance');
  });
});

