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
    expect(settings.enabledPlatforms).toEqual(['Binance', 'OKX']);
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

  it('支持收藏资产 ID 的持久化存储与更新', async () => {
    const settings = await settingsRepo.getSettings();
    expect(settings.favorites).toEqual([]);

    await settingsRepo.updateSettings({ favorites: ['sol_binance', 'btc_okx'] });
    const updated = await settingsRepo.getSettings();
    expect(updated.favorites).toEqual(['sol_binance', 'btc_okx']);

    await settingsRepo.updateSettings({ favorites: ['sol_binance'] });
    const removed = await settingsRepo.getSettings();
    expect(removed.favorites).toEqual(['sol_binance']);
  });

  it('收藏代币排序优先级高于 0 持仓规则 (即使 0 持仓也排在未收藏的有持仓前面)', () => {
    const { isAssetFavorite } = require('../src/domain/types');

    const favorites = ['sol_binance', 'pepe'];

    // 模拟 4 个不同状态的持仓资产
    const holdings = [
      // 未收藏，有持仓，市值 $7000
      { assetId: 'btc_binance', symbol: 'BTC', name: 'Bitcoin', platform: 'Binance', totalQuantity: 0.1, marketValue: 7000, totalBoughtCost: 6000 },
      // 收藏，0持仓 (已清仓)
      { assetId: 'sol_binance', symbol: 'SOL', name: 'Solana', platform: 'Binance', totalQuantity: 0, marketValue: 0, totalBoughtCost: 5000 },
      // 未收藏，0持仓
      { assetId: 'eth_binance', symbol: 'ETH', name: 'Ethereum', platform: 'Binance', totalQuantity: 0, marketValue: 0, totalBoughtCost: 3000 },
      // 收藏，有持仓，市值 $2000
      { assetId: 'pepe', symbol: 'PEPE', name: 'Pepe', platform: 'OKX', totalQuantity: 1000000, marketValue: 2000, totalBoughtCost: 1000 },
    ];

    // 注入 isFavorite 状态
    for (const h of holdings) {
      (h as any).isFavorite = isAssetFavorite(h, favorites);
    }

    expect((holdings[0] as any).isFavorite).toBe(false);
    expect((holdings[1] as any).isFavorite).toBe(true);
    expect((holdings[2] as any).isFavorite).toBe(false);
    expect((holdings[3] as any).isFavorite).toBe(true);

    // 执行业务排序逻辑
    holdings.sort((a, b) => {
      const aFav = !!(a as any).isFavorite;
      const bFav = !!(b as any).isFavorite;
      if (aFav !== bFav) {
        return aFav ? -1 : 1;
      }
      const aHasQty = a.totalQuantity > 0;
      const bHasQty = b.totalQuantity > 0;
      if (aHasQty !== bHasQty) {
        return aHasQty ? -1 : 1;
      }
      if (aHasQty) {
        return b.marketValue - a.marketValue;
      }
      return (b.totalBoughtCost || 0) - (a.totalBoughtCost || 0);
    });

    // 验证顺序：
    // 1. PEPE (收藏，有持仓)
    // 2. SOL (收藏，即便 0 持仓也排在最前组)
    // 3. BTC (未收藏，有持仓)
    // 4. ETH (未收藏，0 持仓沉底)
    expect(holdings.map((h) => h.symbol)).toEqual(['PEPE', 'SOL', 'BTC', 'ETH']);
  });
});
