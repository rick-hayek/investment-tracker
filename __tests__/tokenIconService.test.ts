import { TokenIconService } from '../src/services/tokenIconService';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { MemorySqliteAdapter } from '../src/database/adapters/memorySqliteAdapter';

describe('TokenIconService (代币图标自动获取与缓存服务)', () => {
  let service: TokenIconService;
  let memDb: MemorySqliteAdapter;
  let assetRepo: AssetRepository;

  beforeEach(() => {
    service = TokenIconService.getInstance();
    memDb = new MemorySqliteAdapter();
    assetRepo = new AssetRepository(memDb);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('成功从 CoinCap CDN 探测并返回图标 URL', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (options?.method === 'HEAD' && url.includes('sushi@2x.png')) {
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const url = await service.resolveIconUrl('SUSHI');
    expect(url).toBe('https://assets.coincap.io/assets/icons/sushi@2x.png');
  });

  it('CoinCap 404 时降级查询 CoinGecko 获取官方图标', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (options?.method === 'HEAD') {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (url.includes('api.coingecko.com/api/v3/search')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            coins: [
              {
                id: 'custom-coin',
                name: 'Custom Coin',
                symbol: 'CUSTOM',
                large: 'https://assets.coingecko.com/coins/images/custom/large.png',
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const url = await service.resolveIconUrl('CUSTOM');
    expect(url).toBe('https://assets.coingecko.com/coins/images/custom/large.png');
  });

  it('全部失败或网络异常时优雅返回 null', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

    const url = await service.resolveIconUrl('UNKNOWNTOKEN123');
    expect(url).toBeNull();
  });

  it('syncMissingAssetIcons 自动扫描、拉取并更新 SQLite 数据表', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (options?.method === 'HEAD' && url.includes('act@2x.png')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    await assetRepo.insert({
      id: 'act_binance',
      symbol: 'ACT',
      name: 'Act I',
      platform: 'Binance',
      createdAt: 1000,
    });

    const assets = await assetRepo.findAll();
    expect(assets[0].iconUrl).toBeUndefined();

    let callbackCalled = false;
    await service.syncMissingAssetIcons(assets, assetRepo, (updated) => {
      callbackCalled = true;
      expect(updated.iconUrl).toBe('https://assets.coincap.io/assets/icons/act@2x.png');
    });

    expect(callbackCalled).toBe(true);
    const refreshed = await assetRepo.findById('act_binance');
    expect(refreshed?.iconUrl).toBe('https://assets.coincap.io/assets/icons/act@2x.png');
  });
});
