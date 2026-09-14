import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { SettingsRepository, DEFAULT_USER_SETTINGS } from '../src/database/repositories/settingsRepository';

describe('SettingsRepository (用户偏好配置持久化测试)', () => {
  let db: NodeSqliteAdapter;
  let settingsRepo: SettingsRepository;

  beforeEach(async () => {
    db = new NodeSqliteAdapter(':memory:');
    setDatabaseInstance(db);
    await runMigrations(db);
    settingsRepo = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('初始未配置时返回系统默认用户偏好', async () => {
    const settings = await settingsRepo.getSettings();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
    expect(settings.baseCurrency).toBe('USD');
    expect(settings.privacyMode).toBe(false);
    expect(settings.appSwitcherBlur).toBe(true);
    expect(settings.language).toBe('zh');
    expect(settings.enabledPlatforms).toEqual(['Binance', 'Coinbase', 'CoinGecko', 'OKX']);
  });

  it('成功更新并持久化部分配置项 (含 enabledPlatforms)', async () => {
    const updated = await settingsRepo.updateSettings({
      baseCurrency: 'CNY',
      privacyMode: true,
      language: 'en',
      enabledPlatforms: ['Binance', 'OKX'],
    });

    expect(updated.baseCurrency).toBe('CNY');
    expect(updated.privacyMode).toBe(true);
    expect(updated.appSwitcherBlur).toBe(true); // 保持原有默认值
    expect(updated.language).toBe('en');
    expect(updated.enabledPlatforms).toEqual(['Binance', 'OKX']);

    // 重新从数据库读取确认持久化落盘
    const reloaded = await settingsRepo.getSettings();
    expect(reloaded.baseCurrency).toBe('CNY');
    expect(reloaded.privacyMode).toBe(true);
    expect(reloaded.language).toBe('en');
    expect(reloaded.enabledPlatforms).toEqual(['Binance', 'OKX']);
  });

  it('多次连续更新能正确增量合并', async () => {
    await settingsRepo.updateSettings({ baseCurrency: 'EUR' });
    await settingsRepo.updateSettings({ appSwitcherBlur: false });

    const settings = await settingsRepo.getSettings();
    expect(settings.baseCurrency).toBe('EUR');
    expect(settings.appSwitcherBlur).toBe(false);
    expect(settings.privacyMode).toBe(false);
  });

  it('重置配置能还原出厂默认', async () => {
    await settingsRepo.updateSettings({ baseCurrency: 'CNY', privacyMode: true });
    const reset = await settingsRepo.resetSettings();
    expect(reset).toEqual(DEFAULT_USER_SETTINGS);

    const reloaded = await settingsRepo.getSettings();
    expect(reloaded).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('支持存取自定义 key-value (getRawValue / setRawValue)', async () => {
    const initial = await settingsRepo.getRawValue('test_flag');
    expect(initial).toBeNull();

    await settingsRepo.setRawValue('test_flag', 'true');
    const updated = await settingsRepo.getRawValue('test_flag');
    expect(updated).toBe('true');
  });

  it('清空所有数据时能够同步清除资产、流水与本金充提记录', async () => {
    const { AssetRepository } = require('../src/database/repositories/assetRepository');
    const { TransactionRepository } = require('../src/database/repositories/transactionRepository');
    const { DepositRepository } = require('../src/database/repositories/depositRepository');

    const assetRepo = new AssetRepository(db);
    const txRepo = new TransactionRepository(db);
    const depositRepo = new DepositRepository(db);

    await assetRepo.insert({
      id: 'btc_okx',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'OKX',
      createdAt: 1000,
    });

    await txRepo.insert({
      id: 'tx_1',
      assetId: 'btc_okx',
      type: 'BUY',
      amount: 0.1,
      price: 50000,
      fundingCurrency: 'USDT',
      platform: 'OKX',
      timestamp: 1000,
      createdAt: 1000,
    });

    await depositRepo.insert({
      id: 'dep_1',
      platform: 'OKX',
      currency: 'USDT',
      amount: 20000,
      timestamp: 1000,
      createdAt: 1000,
    });

    // 校验插入成功
    expect((await assetRepo.findAll()).length).toBe(1);
    expect((await txRepo.findAll()).length).toBe(1);
    expect((await depositRepo.findAll()).length).toBe(1);

    // 模拟清空所有数据逻辑
    await txRepo.deleteAll();
    await assetRepo.deleteAll();
    await depositRepo.deleteAll();

    // 校验所有表均已清空
    expect((await assetRepo.findAll()).length).toBe(0);
    expect((await txRepo.findAll()).length).toBe(0);
    expect((await depositRepo.findAll()).length).toBe(0);
  });
});
