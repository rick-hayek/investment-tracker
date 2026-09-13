import { PnLEngine } from '../src/domain/calculations/pnlEngine';
import { Deposit, Transaction, AssetHolding } from '../src/domain/types';
import { DepositRepository } from '../src/database/repositories/depositRepository';
import { MemorySqliteAdapter } from '../src/database/adapters/memorySqliteAdapter';

describe('Deposit & Withdrawal Principal Isolation Suite', () => {
  describe('PnLEngine.validateWithdrawCapital', () => {
    const balances = {
      OKX: { usdt: 1000, usdc: 200, totalUSD: 1200 },
      Binance: { usdt: 500, usdc: 0, totalUSD: 500 },
      Coinbase: { usdt: 0, usdc: 0, totalUSD: 0 },
      CoinGecko: { usdt: 0, usdc: 0, totalUSD: 0 },
    };

    it('rejects non-positive withdrawal amounts', () => {
      expect(PnLEngine.validateWithdrawCapital('OKX', 'USDT', 0, balances).valid).toBe(false);
      expect(PnLEngine.validateWithdrawCapital('OKX', 'USDT', -50, balances).valid).toBe(false);
    });

    it('rejects withdrawal amount exceeding platform available balance', () => {
      const res = PnLEngine.validateWithdrawCapital('OKX', 'USDT', 1001, balances);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('可用本金不足');
      expect(res.available).toBe(1000);
    });

    it('rejects withdrawal on platforms with zero balance', () => {
      const res = PnLEngine.validateWithdrawCapital('Coinbase', 'USDT', 10, balances);
      expect(res.valid).toBe(false);
      expect(res.available).toBe(0);
    });

    it('accepts exact and partial available balance withdrawal', () => {
      const resPartial = PnLEngine.validateWithdrawCapital('OKX', 'USDT', 500, balances);
      expect(resPartial.valid).toBe(true);

      const resExact = PnLEngine.validateWithdrawCapital('OKX', 'USDT', 1000, balances);
      expect(resExact.valid).toBe(true);

      const resUsdc = PnLEngine.validateWithdrawCapital('OKX', 'USDC', 200, balances);
      expect(resUsdc.valid).toBe(true);
    });
  });

  describe('PnLEngine.calculatePlatformBalances with withdrawals', () => {
    it('correctly credits deposits and debits withdrawals per platform', () => {
      const deposits: Deposit[] = [
        {
          id: 'd1',
          type: 'DEPOSIT',
          platform: 'OKX',
          currency: 'USDT',
          amount: 5000,
          timestamp: 1000,
          createdAt: 1000,
        },
        {
          id: 'w1',
          type: 'WITHDRAW',
          platform: 'OKX',
          currency: 'USDT',
          amount: 1500,
          timestamp: 2000,
          createdAt: 2000,
        },
        {
          id: 'd2',
          type: 'DEPOSIT',
          platform: 'Binance',
          currency: 'USDC',
          amount: 2000,
          timestamp: 3000,
          createdAt: 3000,
        },
      ];

      const balances = PnLEngine.calculatePlatformBalances(deposits, []);
      expect(balances.OKX.usdt).toBe(3500); // 5000 - 1500
      expect(balances.OKX.usdc).toBe(0);
      expect(balances.OKX.totalUSD).toBe(3500);

      expect(balances.Binance.usdc).toBe(2000);
      expect(balances.Binance.usdt).toBe(0);
      expect(balances.Binance.totalUSD).toBe(2000);
    });

    it('updates totalNetDepositsUSD as deposits minus withdrawals', () => {
      const deposits: Deposit[] = [
        {
          id: 'd1',
          type: 'DEPOSIT',
          platform: 'OKX',
          currency: 'USDT',
          amount: 10000,
          timestamp: 1000,
          createdAt: 1000,
        },
        {
          id: 'w1',
          type: 'WITHDRAW',
          platform: 'OKX',
          currency: 'USDT',
          amount: 3000,
          timestamp: 2000,
          createdAt: 2000,
        },
      ];

      const summary = PnLEngine.calculatePortfolioSummary([], deposits, []);
      expect(summary.totalNetDepositsUSD).toBe(7000); // 10000 - 3000
      expect(summary.totalCashReservesUSD).toBe(7000);
      expect(summary.totalMarketValue).toBe(7000);
    });
  });

  describe('DepositRepository Persistence for Withdrawals', () => {
    it('persists and retrieves WITHDRAW records correctly', async () => {
      const adapter = new MemorySqliteAdapter();
      const repo = new DepositRepository(adapter);

      await repo.insert({
        id: 'w_test_1',
        type: 'WITHDRAW',
        platform: 'OKX',
        currency: 'USDT',
        amount: 888.5,
        timestamp: 1234567,
        notes: 'Withdraw test to hardware wallet',
        createdAt: 1234567,
      });

      const found = await repo.findById('w_test_1');
      expect(found).not.toBeNull();
      expect(found?.type).toBe('WITHDRAW');
      expect(found?.amount).toBe(888.5);
      expect(found?.notes).toBe('Withdraw test to hardware wallet');
    });

    it('defaults type to DEPOSIT when type is omitted', async () => {
      const adapter = new MemorySqliteAdapter();
      const repo = new DepositRepository(adapter);

      await repo.insert({
        id: 'd_legacy_1',
        platform: 'Binance',
        currency: 'USDC',
        amount: 500,
        timestamp: 2345678,
        createdAt: 2345678,
      });

      const found = await repo.findById('d_legacy_1');
      expect(found?.type).toBe('DEPOSIT');
    });

    it('creates USDT deposit and validates trade cost against USDT balance', async () => {
      const adapter = new MemorySqliteAdapter();
      const repo = new DepositRepository(adapter);

      await repo.insert({
        id: 'd_usdt_simple',
        type: 'DEPOSIT',
        platform: 'OKX',
        currency: 'USDT',
        amount: 2500,
        timestamp: Date.now(),
        createdAt: Date.now(),
      });

      const dep = await repo.findById('d_usdt_simple');
      expect(dep?.currency).toBe('USDT');
      expect(dep?.amount).toBe(2500);

      const balances = PnLEngine.calculatePlatformBalances([dep!], []);
      expect(balances.OKX.usdt).toBe(2500);

      // Buy within budget
      const validBuy = PnLEngine.validateBuyCapital('OKX', 'USDT', 2000, balances);
      expect(validBuy.valid).toBe(true);

      // Buy exceeding budget
      const invalidBuy = PnLEngine.validateBuyCapital('OKX', 'USDT', 3000, balances);
      expect(invalidBuy.valid).toBe(false);
      expect(invalidBuy.shortfall).toBe(500);
    });
  });
});

