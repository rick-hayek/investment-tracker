import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { PriceCacheRepository } from '../src/database/repositories/priceCacheRepository';
import { Asset } from '../src/domain/types';

describe('PriceCacheRepository (市价本地持久化与秒开缓存测试)', () => {
  let db: NodeSqliteAdapter;
  let assetRepo: AssetRepository;
  let priceCacheRepo: PriceCacheRepository;

  beforeEach(async () => {
    db = new NodeSqliteAdapter(':memory:');
    setDatabaseInstance(db);
    await runMigrations(db);

    assetRepo = new AssetRepository(db);
    priceCacheRepo = new PriceCacheRepository(db);

    // 预置两个资产
    const btcAsset: Asset = {
      id: 'btc_binance',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'Binance',
      createdAt: Date.now(),
    };
    const ethAsset: Asset = {
      id: 'eth_okx',
      symbol: 'ETH',
      name: 'Ethereum',
      platform: 'OKX',
      createdAt: Date.now(),
    };

    await assetRepo.insert(btcAsset);
    await assetRepo.insert(ethAsset);
  });

  afterEach(() => {
    db.close();
  });

  it('成功持久化单个代币市价并按 ID 或 Symbol 读取', async () => {
    await priceCacheRepo.savePrice('btc_binance', 'BTC', 68500.5, 3.2, 69000, 67000);

    const byId = await priceCacheRepo.getPrice('btc_binance');
    expect(byId).not.toBeNull();
    expect(byId?.price).toBe(68500.5);
    expect(byId?.change24h).toBe(3.2);

    const bySymbol = await priceCacheRepo.getPrice('btc');
    expect(bySymbol).not.toBeNull();
    expect(bySymbol?.price).toBe(68500.5);
  });

  it('对同一资产重复保存时应更新价格而非插入冲突报错', async () => {
    await priceCacheRepo.savePrice('btc_binance', 'BTC', 68000, 1.5);
    let cached = await priceCacheRepo.getPrice('btc_binance');
    expect(cached?.price).toBe(68000);

    // 更新价格
    await priceCacheRepo.savePrice('btc_binance', 'BTC', 69200, 3.0);
    cached = await priceCacheRepo.getPrice('btc_binance');
    expect(cached?.price).toBe(69200);
    expect(cached?.change24h).toBe(3.0);
  });

  it('批量持久化并一次性全量加载市价字典 (供秒开使用)', async () => {
    await priceCacheRepo.saveBatchPrices([
      { assetId: 'btc_binance', symbol: 'BTC', price: 68000, change24hPercent: 2.1 },
      { assetId: 'eth_okx', symbol: 'ETH', price: 3500, change24hPercent: -1.2 },
    ]);

    const allPrices = await priceCacheRepo.getAllPrices();
    // 验证根据 asset_id 可以检索
    expect(allPrices['btc_binance']).toEqual({ price: 68000, change24h: 2.1 });
    expect(allPrices['eth_okx']).toEqual({ price: 3500, change24h: -1.2 });

    // 验证根据小写 symbol 也可以检索 (双重容错索引)
    expect(allPrices['btc']).toEqual({ price: 68000, change24h: 2.1 });
    expect(allPrices['eth']).toEqual({ price: 3500, change24h: -1.2 });
  });

  it('删除资产时外键级联清理对应的价格缓存', async () => {
    await priceCacheRepo.savePrice('btc_binance', 'BTC', 68000, 2.1);
    expect(await priceCacheRepo.getPrice('btc_binance')).not.toBeNull();

    await assetRepo.delete('btc_binance');
    const afterDelete = await priceCacheRepo.getPrice('btc_binance');
    expect(afterDelete).toBeNull();
  });

  it('支持清理全部市价缓存', async () => {
    await priceCacheRepo.savePrice('btc_binance', 'BTC', 68000, 2.1);
    await priceCacheRepo.clear();
    const all = await priceCacheRepo.getAllPrices();
    expect(Object.keys(all).length).toBe(0);
  });
});
