import { PnLEngine } from '../src/domain/calculations/pnlEngine';
import { Asset, Transaction } from '../src/domain/types';

describe('PnLEngine (财务与盈亏计算引擎)', () => {
  describe('calculateWeightedAverageCost (移动加权平均成本)', () => {
    it('初次买入时，持仓均价应等于买入单价', () => {
      const avg = PnLEngine.calculateWeightedAverageCost(0, 0, 1, 60000);
      expect(avg).toBe(60000);
    });

    it('多批次以不同价格买入，应准确加权分摊', () => {
      // 拥有 1 BTC @ 50,000，追加买入 1 BTC @ 70,000 -> 均价应为 60,000
      const avg = PnLEngine.calculateWeightedAverageCost(1, 50000, 1, 70000);
      expect(avg).toBe(60000);

      // 拥有 2 BTC @ 60,000，追加买入 1 BTC @ 90,000 -> 均价 (120,000 + 90,000) / 3 = 70,000
      const avg2 = PnLEngine.calculateWeightedAverageCost(2, avg, 1, 90000);
      expect(avg2).toBe(70000);
    });

    it('非整数数量加权计算应保持高精度', () => {
      // 0.5 BTC @ 40,000 ($20,000) + 1.5 BTC @ 60,000 ($90,000) -> 2.0 BTC @ 55,000 ($110,000)
      const avg = PnLEngine.calculateWeightedAverageCost(0.5, 40000, 1.5, 60000);
      expect(avg).toBe(55000);
    });

    it('买入数量为 0 或总持有量为 0 时应安全返回 0', () => {
      const avg = PnLEngine.calculateWeightedAverageCost(0, 0, 0, 50000);
      expect(avg).toBe(0);
    });
  });

  describe('calculateUnrealizedPnL (未实现盈亏与收益率)', () => {
    it('当现价高于持仓均价时，应为正收益', () => {
      // 持有 2 BTC，均价 50,000，现价 65,000 -> 盈利 30,000，涨幅 30%
      const result = PnLEngine.calculateUnrealizedPnL(65000, 50000, 2);
      expect(result.pnlAmount).toBe(30000);
      expect(result.pnlPercent).toBe(30);
    });

    it('当现价低于持仓均价时，应为负收益', () => {
      // 持有 1 ETH，均价 4,000，现价 3,000 -> 亏损 -1,000，跌幅 -25%
      const result = PnLEngine.calculateUnrealizedPnL(3000, 4000, 1);
      expect(result.pnlAmount).toBe(-1000);
      expect(result.pnlPercent).toBe(-25);
    });

    it('持仓量为 0 或均价为 0 时，盈亏应为 0', () => {
      const result = PnLEngine.calculateUnrealizedPnL(65000, 0, 0);
      expect(result.pnlAmount).toBe(0);
      expect(result.pnlPercent).toBe(0);
    });
  });

  describe('calculateRealizedPnL (已实现盈亏结转)', () => {
    it('盈利卖出并扣除手续费', () => {
      // 均价 50,000，卖出 0.5 BTC @ 60,000，手续费 10 USD
      // 毛利: (60,000 - 50,000) * 0.5 = 5,000; 净利 = 5,000 - 10 = 4,990
      const pnl = PnLEngine.calculateRealizedPnL(60000, 50000, 0.5, 10);
      expect(pnl).toBe(4990);
    });

    it('亏损卖出时，已实现盈亏为负数', () => {
      // 均价 50,000，卖出 1 BTC @ 45,000，手续费 5 USD -> -5,005
      const pnl = PnLEngine.calculateRealizedPnL(45000, 50000, 1, 5);
      expect(pnl).toBe(-5005);
    });
  });

  describe('validateTransaction (交易录入合法性校验与防超卖)', () => {
    it('有效买入应校验通过', () => {
      const check = PnLEngine.validateTransaction('BUY', 1, 60000);
      expect(check.valid).toBe(true);
    });

    it('数量小于等于 0 时应拒绝', () => {
      const check = PnLEngine.validateTransaction('BUY', 0, 60000);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('必须大于 0');
    });

    it('单价小于 0 时应拒绝', () => {
      const check = PnLEngine.validateTransaction('BUY', 1, -100);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('不能小于 0');
    });

    it('卖出数量小于等于持仓量时应允许', () => {
      const check = PnLEngine.validateTransaction('SELL', 0.5, 60000, 1.0);
      expect(check.valid).toBe(true);
    });

    it('卖出数量大于持仓量时应阻断防超卖', () => {
      const check = PnLEngine.validateTransaction('SELL', 1.5, 60000, 1.0);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('超出当前持仓可用量');
    });
  });

  describe('calculateHoldingFromTransactions (全量流水回放与持仓计算)', () => {
    const mockAsset: Asset = {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      platform: 'Binance',
      createdAt: 1700000000000,
    };

    it('完整生命周期测试: 多次加仓 -> 部分获利减仓 -> 当前未实现盈亏估值', () => {
      const transactions: Transaction[] = [
        // 1. 买入 1.0 BTC @ 50,000
        {
          id: 'tx-1',
          assetId: 'btc',
          type: 'BUY',
          amount: 1.0,
          price: 50000,
          platform: 'Binance',
          timestamp: 1000,
          createdAt: 1000,
        },
        // 2. 买入 1.0 BTC @ 70,000 (总持币 2.0，均价 60,000)
        {
          id: 'tx-2',
          assetId: 'btc',
          type: 'BUY',
          amount: 1.0,
          price: 70000,
          platform: 'Binance',
          timestamp: 2000,
          createdAt: 2000,
        },
        // 3. 卖出 0.5 BTC @ 80,000 (已实现盈亏: (80,000 - 60,000) * 0.5 = 10,000; 剩余 1.5 BTC，均价仍为 60,000)
        {
          id: 'tx-3',
          assetId: 'btc',
          type: 'SELL',
          amount: 0.5,
          price: 80000,
          platform: 'Binance',
          timestamp: 3000,
          createdAt: 3000,
        },
      ];

      // 假定当前最新实时市价为 $68,000
      const holding = PnLEngine.calculateHoldingFromTransactions(
        mockAsset,
        transactions,
        68000,
        3.5
      );

      expect(holding.totalQuantity).toBe(1.5);
      expect(holding.averageCost).toBe(60000);
      expect(holding.totalCostBasis).toBe(90000); // 1.5 * 60,000
      expect(holding.marketValue).toBe(102000); // 1.5 * 68,000
      expect(holding.unrealizedPnL).toBe(12000); // 102,000 - 90,000
      expect(holding.realizedPnL).toBe(10000); // 卖出的获利
    });

    it('完全清仓后再买入，成本均价应重新计算', () => {
      const transactions: Transaction[] = [
        // 买入 1 BTC @ 40,000
        {
          id: 'tx-1',
          assetId: 'btc',
          type: 'BUY',
          amount: 1.0,
          price: 40000,
          platform: 'Binance',
          timestamp: 1000,
          createdAt: 1000,
        },
        // 全量卖出 1 BTC @ 50,000 (清仓，已实现 +10,000)
        {
          id: 'tx-2',
          assetId: 'btc',
          type: 'SELL',
          amount: 1.0,
          price: 50000,
          platform: 'Binance',
          timestamp: 2000,
          createdAt: 2000,
        },
        // 重新入场买入 0.5 BTC @ 60,000
        {
          id: 'tx-3',
          assetId: 'btc',
          type: 'BUY',
          amount: 0.5,
          price: 60000,
          platform: 'Binance',
          timestamp: 3000,
          createdAt: 3000,
        },
      ];

      const holding = PnLEngine.calculateHoldingFromTransactions(
        mockAsset,
        transactions,
        65000
      );

      expect(holding.totalQuantity).toBe(0.5);
      expect(holding.averageCost).toBe(60000); // 新买入的均价，不受上一轮已清仓记录影响
      expect(holding.realizedPnL).toBe(10000);
      expect(holding.unrealizedPnL).toBe(2500); // (65,000 - 60,000) * 0.5
    });

    it('加密货币 8 位小数高精度测试，不发生精度丢失', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx-1',
          assetId: 'btc',
          type: 'BUY',
          amount: 0.00123456,
          price: 60000,
          platform: 'Binance',
          timestamp: 1000,
          createdAt: 1000,
        },
        {
          id: 'tx-2',
          assetId: 'btc',
          type: 'BUY',
          amount: 0.00054321,
          price: 65000,
          platform: 'Binance',
          timestamp: 2000,
          createdAt: 2000,
        },
      ];

      const holding = PnLEngine.calculateHoldingFromTransactions(
        mockAsset,
        transactions,
        70000
      );

      // 0.00123456 + 0.00054321 = 0.00177777
      expect(holding.totalQuantity).toBe(0.00177777);
    });

    it('历史流水超卖时抛出明确异常', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx-1',
          assetId: 'btc',
          type: 'BUY',
          amount: 0.5,
          price: 50000,
          platform: 'Binance',
          timestamp: 1000,
          createdAt: 1000,
        },
        {
          id: 'tx-2',
          assetId: 'btc',
          type: 'SELL',
          amount: 1.0, // 试图卖出 1.0 > 0.5
          price: 60000,
          platform: 'Binance',
          timestamp: 2000,
          createdAt: 2000,
        },
      ];

      expect(() => {
        PnLEngine.calculateHoldingFromTransactions(mockAsset, transactions, 60000);
      }).toThrow(/exceeds available holding/);
    });
  });

  describe('calculatePortfolioSummary (多资产投资组合总览汇总)', () => {
    it('聚合所有代币持仓数据，正确计算总市值、总成本与总盈亏', () => {
      const holdings = [
        {
          assetId: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          totalQuantity: 1.0,
          averageCost: 60000,
          totalCostBasis: 60000,
          currentPrice: 68000,
          marketValue: 68000,
          unrealizedPnL: 8000,
          unrealizedPnLPercent: 13.33,
          realizedPnL: 5000,
          change24hPercent: 3.5,
        },
        {
          assetId: 'eth',
          symbol: 'ETH',
          name: 'Ethereum',
          totalQuantity: 10.0,
          averageCost: 3000,
          totalCostBasis: 30000,
          currentPrice: 3500,
          marketValue: 35000,
          unrealizedPnL: 5000,
          unrealizedPnLPercent: 16.67,
          realizedPnL: -1000,
          change24hPercent: 5.2,
        },
      ];

      const summary = PnLEngine.calculatePortfolioSummary(holdings);

      expect(summary.totalMarketValue).toBe(103000); // 68,000 + 35,000
      expect(summary.totalCostBasis).toBe(90000); // 60,000 + 30,000
      expect(summary.totalUnrealizedPnL).toBe(13000); // 8,000 + 5,000
      expect(summary.totalRealizedPnL).toBe(4000); // 5,000 - 1,000
      expect(summary.netProfit).toBe(17000); // 13,000 + 4,000
      expect(summary.totalUnrealizedPnLPercent).toBeCloseTo(14.44, 1);
    });
  });
});
