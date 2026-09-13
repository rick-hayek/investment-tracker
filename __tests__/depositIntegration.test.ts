import { PnLEngine } from '../src/domain/calculations/pnlEngine';
import { MemorySqliteAdapter } from '../src/database/adapters/memorySqliteAdapter';
import { DepositRepository } from '../src/database/repositories/depositRepository';
import { TransactionRepository } from '../src/database/repositories/transactionRepository';
import { AssetRepository } from '../src/database/repositories/assetRepository';
import { Deposit, Transaction, Asset } from '../src/domain/types';

describe('Multi-Exchange Aggregator Capital Isolation & Deposit Flow', () => {
  let dbAdapter: MemorySqliteAdapter;
  let depositRepo: DepositRepository;
  let txRepo: TransactionRepository;
  let assetRepo: AssetRepository;

  beforeEach(() => {
    dbAdapter = new MemorySqliteAdapter();
    depositRepo = new DepositRepository(dbAdapter);
    txRepo = new TransactionRepository(dbAdapter);
    assetRepo = new AssetRepository(dbAdapter);
  });

  test('Deposit to OKX increases OKX balance and keeps Binance balance 0', async () => {
    // 1. 充值 5,000 USDT 到 OKX
    await depositRepo.insert({
      id: 'dep_1',
      platform: 'OKX',
      currency: 'USDT',
      amount: 5000,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    const deposits = await depositRepo.findAll();
    const txs = await txRepo.findAll();
    const balances = PnLEngine.calculatePlatformBalances(deposits, txs);

    expect(balances.OKX.usdt).toBe(5000);
    expect(balances.OKX.totalUSD).toBe(5000);
    expect(balances.Binance.usdt).toBe(0);
    expect(balances.Binance.totalUSD).toBe(0);
    expect(balances.Coinbase.totalUSD).toBe(0);
  });

  test('Strict platform isolation: Cannot buy on Binance using OKX capital', async () => {
    // 1. 充值 10,000 USDT 到 OKX
    await depositRepo.insert({
      id: 'dep_okx_1',
      platform: 'OKX',
      currency: 'USDT',
      amount: 10000,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    const deposits = await depositRepo.findAll();
    const txs = await txRepo.findAll();
    const balances = PnLEngine.calculatePlatformBalances(deposits, txs);

    // 在 Binance 试图买入 1,000 USDT 的代币 -> 校验失败
    const binanceValidation = PnLEngine.validateBuyCapital('Binance', 'USDT', 1000, balances);
    expect(binanceValidation.valid).toBe(false);
    expect(binanceValidation.error).toContain('Binance');
    expect(binanceValidation.error).toContain('USDT');

    // 在 OKX 试图买入 1,000 USDT 的代币 -> 校验成功
    const okxValidation = PnLEngine.validateBuyCapital('OKX', 'USDT', 1000, balances);
    expect(okxValidation.valid).toBe(true);
  });

  test('Buying asset deducts capital; selling returns proceeds back to platform capital', async () => {
    // 1. 充值 10,000 USDT 到 Binance
    await depositRepo.insert({
      id: 'dep_binance_1',
      platform: 'Binance',
      currency: 'USDT',
      amount: 10000,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    // 2. 在 Binance 买入 0.1 BTC @ $60,000 (总成本 6,000 USDT)
    const buyTx: Transaction = {
      id: 'tx_buy_1',
      assetId: 'btc_binance',
      type: 'BUY',
      amount: 0.1,
      price: 60000,
      fee: 0,
      feeCurrency: 'USD',
      fundingCurrency: 'USDT',
      platform: 'Binance',
      timestamp: Date.now(),
      createdAt: Date.now(),
    };
    await txRepo.insert(buyTx);

    let deposits = await depositRepo.findAll();
    let txs = await txRepo.findAll();
    let balances = PnLEngine.calculatePlatformBalances(deposits, txs);

    expect(balances.Binance.usdt).toBe(4000); // 10,000 - 6,000

    // 3. 在 Binance 以 $70,000 卖出 0.1 BTC (回款 7,000 USDT)
    const sellTx: Transaction = {
      id: 'tx_sell_1',
      assetId: 'btc_binance',
      type: 'SELL',
      amount: 0.1,
      price: 70000,
      fee: 0,
      feeCurrency: 'USD',
      fundingCurrency: 'USDT',
      platform: 'Binance',
      timestamp: Date.now() + 1000,
      createdAt: Date.now() + 1000,
    };
    await txRepo.insert(sellTx);

    deposits = await depositRepo.findAll();
    txs = await txRepo.findAll();
    balances = PnLEngine.calculatePlatformBalances(deposits, txs);

    // 剩余 4,000 + 卖出回款 7,000 = 11,000 USDT
    expect(balances.Binance.usdt).toBe(11000);
    expect(balances.Binance.totalUSD).toBe(11000);
  });

  test('Portfolio summary aggregates crypto holdings + cash reserves correctly', async () => {
    // 1. 充值 20,000 USDT 到 OKX
    await depositRepo.insert({
      id: 'dep_okx_2',
      platform: 'OKX',
      currency: 'USDT',
      amount: 20000,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    // 2. 买入 10 ETH @ $3,000 (花费 30,000 超额拦截测试)
    const deposits = await depositRepo.findAll();
    let txs = await txRepo.findAll();
    let balances = PnLEngine.calculatePlatformBalances(deposits, txs);
    expect(PnLEngine.validateBuyCapital('OKX', 'USDT', 30000, balances).valid).toBe(false);

    // 3. 买入 5 ETH @ $3,000 (花费 15,000 USDT)
    const buyEthTx: Transaction = {
      id: 'tx_eth_1',
      assetId: 'eth_okx',
      type: 'BUY',
      amount: 5,
      price: 3000,
      fee: 0,
      feeCurrency: 'USD',
      fundingCurrency: 'USDT',
      platform: 'OKX',
      timestamp: Date.now(),
      createdAt: Date.now(),
    };
    await txRepo.insert(buyEthTx);

    const asset: Asset = {
      id: 'eth_okx',
      symbol: 'ETH',
      name: 'Ethereum',
      platform: 'OKX',
      createdAt: Date.now(),
    };
    await assetRepo.insert(asset);

    txs = await txRepo.findAll();
    const holding = PnLEngine.calculateHoldingFromTransactions(asset, txs, 3500, 5); // 现价 $3,500
    const summary = PnLEngine.calculatePortfolioSummary([holding], deposits, txs);

    // 代币持仓市值: 5 * 3,500 = $17,500
    expect(summary.totalCryptoMarketValueUSD).toBe(17500);
    // 现金储备: 20,000 - 15,000 = $5,000
    expect(summary.totalCashReservesUSD).toBe(5000);
    // 全平台总财产 (代币 + 现金): 17,500 + 5,000 = $22,500
    expect(summary.totalPortfolioValueUSD).toBe(22500);
    expect(summary.totalMarketValue).toBe(22500);
    // 净入金本金: $20,000
    expect(summary.totalNetDepositsUSD).toBe(20000);
    // 净投资收益: 22,500 - 20,000 = $2,500 (即 ETH 浮盈 5 * 500 = 2,500)
    expect(summary.totalNetProfitUSD).toBe(2500);
  });
});
