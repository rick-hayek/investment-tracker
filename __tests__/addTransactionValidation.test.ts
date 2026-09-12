import { PnLEngine } from '../src/domain/calculations/pnlEngine';
import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { TransactionRepository } from '../src/database/repositories/transactionRepository';
import { extractBaseSymbol, resolveCoinGeckoId } from '../src/services/symbolMapper';

describe('Add Transaction Validation & Persistence (交易录入与防超卖校验测试)', () => {
  let db: NodeSqliteAdapter;
  let assetRepo: AssetRepository;
  let txRepo: TransactionRepository;

  beforeEach(async () => {
    db = new NodeSqliteAdapter(':memory:');
    setDatabaseInstance(db);
    await runMigrations(db);

    assetRepo = new AssetRepository(db);
    txRepo = new TransactionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('防超卖与表单输入规则校验 (PnLEngine.validateTransaction)', () => {
    it('常规买入：数量大于0且单价非负时校验通过', () => {
      const res = PnLEngine.validateTransaction('BUY', 1.5, 65000);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('数量为 0 或负数时，拦截并报错', () => {
      const res1 = PnLEngine.validateTransaction('BUY', 0, 65000);
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('交易数量必须大于 0');

      const res2 = PnLEngine.validateTransaction('BUY', -0.5, 65000);
      expect(res2.valid).toBe(false);
    });

    it('单价为负数时，拦截并报错', () => {
      const res = PnLEngine.validateTransaction('BUY', 1.0, -100);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('成交价格不能小于 0');
    });

    it('卖出拦截：卖出数量超过持仓可用量时，防超卖阻断', () => {
      // 当前持仓可用量为 1.0，尝试卖出 1.5
      const res = PnLEngine.validateTransaction('SELL', 1.5, 68000, 1.0);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('超出当前持仓可用量');
    });

    it('卖出允许：卖出数量小于或等于当前持仓可用量时，校验通过', () => {
      // 部分卖出
      const resPart = PnLEngine.validateTransaction('SELL', 0.8, 68000, 1.0);
      expect(resPart.valid).toBe(true);

      // 全部清仓卖出
      const resFull = PnLEngine.validateTransaction('SELL', 1.0, 68000, 1.0);
      expect(resFull.valid).toBe(true);
    });
  });

  describe('数据写入与持仓联动闭环', () => {
    it('录入新代币交易时，自动创建资产档案并写入流水', async () => {
      const inputSymbol = 'SOLUSDT';
      const base = extractBaseSymbol(inputSymbol);
      const assetId = base.toLowerCase();

      // 检查资产初始不存在
      let asset = await assetRepo.findById(assetId);
      expect(asset).toBeNull();

      // 模拟添加买入交易
      await assetRepo.insert({
        id: assetId,
        symbol: base,
        name: 'Solana',
        platform: 'Binance',
        createdAt: Date.now(),
      });

      await txRepo.insert({
        id: 'tx_sol_001',
        assetId,
        type: 'BUY',
        amount: 50,
        price: 140,
        platform: 'Binance',
        timestamp: Date.now(),
        createdAt: Date.now(),
      });

      // 验证资产已建档
      asset = await assetRepo.findById(assetId);
      expect(asset).not.toBeNull();
      expect(asset?.symbol).toBe('SOL');

      // 验证流水已记录
      const txs = await txRepo.findByAssetId(assetId);
      expect(txs.length).toBe(1);
      expect(txs[0].amount).toBe(50);

      // 计算当前持仓量
      const holding = PnLEngine.calculateHoldingFromTransactions(asset!, txs, 150);
      expect(holding.totalQuantity).toBe(50);

      // 模拟卖出 20 SOL
      const sellValidation = PnLEngine.validateTransaction('SELL', 20, 160, holding.totalQuantity);
      expect(sellValidation.valid).toBe(true);

      await txRepo.insert({
        id: 'tx_sol_002',
        assetId,
        type: 'SELL',
        amount: 20,
        price: 160,
        platform: 'Binance',
        timestamp: Date.now() + 1000,
        createdAt: Date.now() + 1000,
      });

      const updatedTxs = await txRepo.findByAssetId(assetId);
      const updatedHolding = PnLEngine.calculateHoldingFromTransactions(asset!, updatedTxs, 160);
      expect(updatedHolding.totalQuantity).toBe(30);

      // 模拟超卖 40 SOL (当前仅剩 30) -> 阻断
      const overSellValidation = PnLEngine.validateTransaction(
        'SELL',
        40,
        160,
        updatedHolding.totalQuantity
      );
      expect(overSellValidation.valid).toBe(false);
      expect(overSellValidation.error).toContain('超出当前持仓可用量');
    });

    it('在 OKX 和 Binance 购买相同代币 (如 BTC)，生成 2 条独立交易并分别维护持仓', async () => {
      // 1. Binance 买入 1.0 BTC
      const binanceAssetId = 'btc_binance';
      await assetRepo.insert({
        id: binanceAssetId,
        symbol: 'BTC',
        name: 'Bitcoin',
        platform: 'Binance',
        createdAt: Date.now(),
      });
      await txRepo.insert({
        id: 'tx_binance_btc',
        assetId: binanceAssetId,
        type: 'BUY',
        amount: 1.0,
        price: 65000,
        platform: 'Binance',
        timestamp: Date.now(),
        createdAt: Date.now(),
      });

      // 2. OKX 买入 0.5 BTC
      const okxAssetId = 'btc_okx';
      await assetRepo.insert({
        id: okxAssetId,
        symbol: 'BTC',
        name: 'Bitcoin',
        platform: 'OKX',
        createdAt: Date.now() + 100,
      });
      await txRepo.insert({
        id: 'tx_okx_btc',
        assetId: okxAssetId,
        type: 'BUY',
        amount: 0.5,
        price: 65200,
        platform: 'OKX',
        timestamp: Date.now() + 100,
        createdAt: Date.now() + 100,
      });

      // 验证生成了 2 条独立的交易流水
      const allTxs = await txRepo.findAll();
      expect(allTxs.length).toBe(2);
      expect(allTxs.find((t) => t.platform === 'Binance')?.amount).toBe(1.0);
      expect(allTxs.find((t) => t.platform === 'OKX')?.amount).toBe(0.5);

      // 验证在资产列表里是 2 个独立的平台资产
      const allAssets = await assetRepo.findAll();
      expect(allAssets.length).toBe(2);
      expect(allAssets.find((a) => a.id === 'btc_binance')?.platform).toBe('Binance');
      expect(allAssets.find((a) => a.id === 'btc_okx')?.platform).toBe('OKX');

      // 验证持仓计算各自独立
      const binanceHolding = PnLEngine.calculateHoldingFromTransactions(
        allAssets.find((a) => a.id === 'btc_binance')!,
        await txRepo.findByAssetId(binanceAssetId),
        68000
      );
      const okxHolding = PnLEngine.calculateHoldingFromTransactions(
        allAssets.find((a) => a.id === 'btc_okx')!,
        await txRepo.findByAssetId(okxAssetId),
        68000
      );

      expect(binanceHolding.totalQuantity).toBe(1.0);
      expect(binanceHolding.platform).toBe('Binance');
      expect(okxHolding.totalQuantity).toBe(0.5);
      expect(okxHolding.platform).toBe('OKX');

      // 验证防超卖独立性：在 OKX 卖出 0.8 BTC 应该被拦截（因为 OKX 只有 0.5），哪怕 Binance 上有 1.0 BTC
      const okxOversell = PnLEngine.validateTransaction('SELL', 0.8, 68000, okxHolding.totalQuantity);
      expect(okxOversell.valid).toBe(false);
      expect(okxOversell.error).toContain('超出当前持仓可用量');
    });
  });
});
