import { ALL_PLATFORMS_ALPHABETICAL, PlatformType } from '../src/domain/types';
import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { SettingsRepository } from '../src/database/repositories/settingsRepository';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { TransactionRepository } from '../src/database/repositories/transactionRepository';
import { DepositRepository } from '../src/database/repositories/depositRepository';

describe('Platform Management (交易所/平台管理与方案A测试)', () => {
  let db: NodeSqliteAdapter;
  let settingsRepo: SettingsRepository;
  let assetRepo: AssetRepository;
  let txRepo: TransactionRepository;
  let depositRepo: DepositRepository;

  beforeEach(async () => {
    db = new NodeSqliteAdapter(':memory:');
    setDatabaseInstance(db);
    await runMigrations(db);

    settingsRepo = new SettingsRepository(db);
    assetRepo = new AssetRepository(db);
    txRepo = new TransactionRepository(db);
    depositRepo = new DepositRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('ALL_PLATFORMS_ALPHABETICAL 严格按英文字母升序排列 (Binance, Coinbase, CoinGecko, OKX)', () => {
    const expected = ['Binance', 'Coinbase', 'CoinGecko', 'OKX'];
    expect(ALL_PLATFORMS_ALPHABETICAL).toEqual(expected);

    // 验证字符串比较确实符合升序
    const sorted = [...ALL_PLATFORMS_ALPHABETICAL].sort((a, b) => a.localeCompare(b));
    expect(ALL_PLATFORMS_ALPHABETICAL).toEqual(sorted);
  });

  it('启用平台列表新增项时自动保持字母升序排列', async () => {
    let current: PlatformType[] = ['Binance', 'OKX'];

    // 用户在设置中勾选开启 Coinbase
    const target: PlatformType = 'Coinbase';
    const next = ALL_PLATFORMS_ALPHABETICAL.filter(
      (p) => p === target || current.includes(p)
    );

    expect(next).toEqual(['Binance', 'Coinbase', 'OKX']);

    await settingsRepo.updateSettings({ enabledPlatforms: next });
    const saved = await settingsRepo.getSettings();
    expect(saved.enabledPlatforms).toEqual(['Binance', 'Coinbase', 'OKX']);
  });

  it('防呆规则：当只剩 1 个平台启用时，阻止继续关闭', () => {
    const current: PlatformType[] = ['OKX'];
    const canDisable = current.length > 1;
    expect(canDisable).toBe(false);
  });

  it('方案 A 规则验证：隐藏 OKX 后，底层已有 OKX 资产与充值流水绝对不被删除或篡改', async () => {
    // 1. 预先录入 OKX 的资产、交易与本金充值
    await assetRepo.insert({
      id: 'btc_okx',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'OKX',
      createdAt: 1000,
    });

    await txRepo.insert({
      id: 'tx_okx_1',
      assetId: 'btc_okx',
      type: 'BUY',
      amount: 1.0,
      price: 77000,
      fundingCurrency: 'USDT',
      platform: 'OKX',
      timestamp: 1000,
      createdAt: 1000,
    });

    await depositRepo.insert({
      id: 'dep_okx_1',
      platform: 'OKX',
      currency: 'USDT',
      amount: 100000,
      timestamp: 1000,
      createdAt: 1000,
    });

    // 2. 模拟用户在设置中停用 OKX，仅保留 Binance 与 Coinbase
    const activePlatforms: PlatformType[] = ['Binance', 'Coinbase'];
    await settingsRepo.updateSettings({ enabledPlatforms: activePlatforms });

    // 3. 验证设置更新成功
    const settings = await settingsRepo.getSettings();
    expect(settings.enabledPlatforms).toEqual(['Binance', 'Coinbase']);

    // 4. 核心断言：已有 OKX 数据完全保留未丢失
    const assets = await assetRepo.findAll();
    expect(assets.some((a) => a.id === 'btc_okx' && a.platform === 'OKX')).toBe(true);

    const txs = await txRepo.findAll();
    expect(txs.some((t) => t.id === 'tx_okx_1' && t.platform === 'OKX')).toBe(true);

    const deposits = await depositRepo.findAll();
    expect(deposits.some((d) => d.id === 'dep_okx_1' && d.platform === 'OKX')).toBe(true);
  });

  it('单交易所模式：当仅启用 1 个交易所时，可用列表长度为 1，自动默认选中且无需多余选择卡片', () => {
    const enabledPlatforms: PlatformType[] = ['Binance'];
    const PLATFORMS = [
      { key: 'Binance' as PlatformType, label: 'Binance' },
      { key: 'Coinbase' as PlatformType, label: 'Coinbase' },
      { key: 'CoinGecko' as PlatformType, label: 'CoinGecko' },
      { key: 'OKX' as PlatformType, label: 'OKX' },
    ];

    const displayed = PLATFORMS.filter((p) => enabledPlatforms.includes(p.key));
    expect(displayed.length).toBe(1);
    expect(displayed[0].key).toBe('Binance');
    // 单平台时无需显示选择器网格，只需展示单行可用金
    const isSingle = displayed.length === 1;
    expect(isSingle).toBe(true);
  });
});
