import { PnLEngine } from '../src/domain/calculations/pnlEngine';
import { Deposit, Transaction, AssetHolding } from '../src/domain/types';

describe('PnLEngine - 多交易所本金充值、资金隔离与财产核算模型测试', () => {
  describe('calculatePlatformBalances (交易所可用本金推导)', () => {
    it('支持针对单平台充值 USDT 与 USDC 并累加', () => {
      const deposits: Deposit[] = [
        {
          id: 'dep_1',
          platform: 'OKX',
          currency: 'USDT',
          amount: 1000,
          timestamp: 1710000000000,
          createdAt: 1710000000000,
        },
        {
          id: 'dep_2',
          platform: 'OKX',
          currency: 'USDC',
          amount: 500,
          timestamp: 1710000001000,
          createdAt: 1710000001000,
        },
      ];

      const balances = PnLEngine.calculatePlatformBalances(deposits, []);
      expect(balances.OKX.usdt).toBe(1000);
      expect(balances.OKX.usdc).toBe(500);
      expect(balances.OKX.totalUSD).toBe(1500);
      expect(balances.Binance.totalUSD).toBe(0);
    });

    it('买入时扣减该平台对应稳定币本金，卖出时自动回笼增计', () => {
      const deposits: Deposit[] = [
        {
          id: 'dep_1',
          platform: 'OKX',
          currency: 'USDT',
          amount: 1000,
          timestamp: 1710000000000,
          createdAt: 1710000000000,
        },
      ];

      const transactions: Transaction[] = [
        // OKX 买入 0.01 BTC @ $60,000 = $600，手续费 $2 USDT
        {
          id: 'tx_1',
          assetId: 'btc_okx',
          type: 'BUY',
          amount: 0.01,
          price: 60000,
          fee: 2,
          fundingCurrency: 'USDT',
          platform: 'OKX',
          timestamp: 1710000005000,
          createdAt: 1710000005000,
        },
        // OKX 卖出 0.005 BTC @ $70,000 = $350，手续费 $1 USDT -> 净回款 $349 USDT
        {
          id: 'tx_2',
          assetId: 'btc_okx',
          type: 'SELL',
          amount: 0.005,
          price: 70000,
          fee: 1,
          fundingCurrency: 'USDT',
          platform: 'OKX',
          timestamp: 1710000010000,
          createdAt: 1710000010000,
        },
      ];

      // 预期 USDT 剩余: 1000 - 602 + 349 = 747 USDT
      const balances = PnLEngine.calculatePlatformBalances(deposits, transactions);
      expect(balances.OKX.usdt).toBe(747);
      expect(balances.OKX.totalUSD).toBe(747);
    });

    it('平台资金严格物理隔离：各交易所本金互不干扰', () => {
      const deposits: Deposit[] = [
        {
          id: 'dep_1',
          platform: 'OKX',
          currency: 'USDT',
          amount: 2000,
          timestamp: 1710000000000,
          createdAt: 1710000000000,
        },
        {
          id: 'dep_2',
          platform: 'Binance',
          currency: 'USDC',
          amount: 500,
          timestamp: 1710000001000,
          createdAt: 1710000001000,
        },
      ];

      // 在 Binance 买入 $300 USDC，不应影响 OKX 的 2000 USDT
      const transactions: Transaction[] = [
        {
          id: 'tx_binance',
          assetId: 'eth_binance',
          type: 'BUY',
          amount: 0.1,
          price: 3000,
          fee: 0,
          fundingCurrency: 'USDC',
          platform: 'Binance',
          timestamp: 1710000005000,
          createdAt: 1710000005000,
        },
      ];

      const balances = PnLEngine.calculatePlatformBalances(deposits, transactions);
      expect(balances.OKX.usdt).toBe(2000);
      expect(balances.OKX.totalUSD).toBe(2000);
      expect(balances.Binance.usdc).toBe(200);
      expect(balances.Binance.totalUSD).toBe(200);
    });
  });

  describe('validateBuyCapital (买入本金充足性强校验)', () => {
    it('当所需花费 <= 可用本金时校验通过', () => {
      const res = PnLEngine.validateBuyCapital('OKX', 'USDT', 500, 1000);
      expect(res.valid).toBe(true);
      expect(res.shortfall).toBe(0);
    });

    it('当所需花费 > 可用本金时校验失败并提示差额', () => {
      const res = PnLEngine.validateBuyCapital('OKX', 'USDT', 1200, 1000);
      expect(res.valid).toBe(false);
      expect(res.shortfall).toBe(200);
      expect(res.error).toContain('当前 OKX 平台 USDT 可用本金不足 (缺少 $200.00)');
    });

    it('非法或 <= 0 花费拦截', () => {
      const res = PnLEngine.validateBuyCapital('Binance', 'USDC', 0, 500);
      expect(res.valid).toBe(false);
    });
  });

  describe('calculatePortfolioSummary (聚合总财产与全周期净盈亏)', () => {
    it('准确聚合代币市值与各交易所现金储备并计算净投资收益', () => {
      const mockHoldings: AssetHolding[] = [
        {
          assetId: 'btc_okx',
          symbol: 'BTC',
          name: 'Bitcoin',
          platform: 'OKX',
          totalQuantity: 0.1,
          averageCost: 50000,
          totalCostBasis: 5000,
          currentPrice: 60000,
          marketValue: 6000, // 盈利 1000
          unrealizedPnL: 1000,
          unrealizedPnLPercent: 20,
          realizedPnL: 0,
          change24hPercent: 2.5,
        },
      ];

      const deposits: Deposit[] = [
        // OKX 充值 6000 USDT (5000 买 BTC，还剩 1000 USDT)
        {
          id: 'dep_1',
          platform: 'OKX',
          currency: 'USDT',
          amount: 6000,
          timestamp: 1710000000000,
          createdAt: 1710000000000,
        },
        // Binance 充值 500 USDC 备用
        {
          id: 'dep_2',
          platform: 'Binance',
          currency: 'USDC',
          amount: 500,
          timestamp: 1710000001000,
          createdAt: 1710000001000,
        },
      ];

      const transactions: Transaction[] = [
        {
          id: 'tx_1',
          assetId: 'btc_okx',
          type: 'BUY',
          amount: 0.1,
          price: 50000,
          fee: 0,
          fundingCurrency: 'USDT',
          platform: 'OKX',
          timestamp: 1710000005000,
          createdAt: 1710000005000,
        },
      ];

      const summary = PnLEngine.calculatePortfolioSummary(mockHoldings, deposits, transactions);

      // 代币市值: 6000
      expect(summary.totalCryptoMarketValueUSD).toBe(6000);
      // 现金储备: OKX 1000 + Binance 500 = 1500
      expect(summary.totalCashReservesUSD).toBe(1500);
      // 全平台总财产: 6000 + 1500 = 7500
      expect(summary.totalPortfolioValueUSD).toBe(7500);
      expect(summary.totalMarketValue).toBe(7500);
      // 累计净充值本金: 6000 + 500 = 6500
      expect(summary.totalNetDepositsUSD).toBe(6500);
      // 投资净收益: 7500 - 6500 = 1000
      expect(summary.totalNetProfitUSD).toBe(1000);
      // 净回报率: 1000 / 6500 = 15.38%
      expect(summary.totalNetProfitPercent).toBeCloseTo(15.3846, 2);
    });
  });
});
