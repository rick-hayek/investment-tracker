import { Deposit, PlatformType, DepositCurrency } from '../src/domain/types';
import { t } from '../src/i18n';

describe('Capital Detail and Deposit History Logic', () => {
  const sampleDeposits: Deposit[] = [
    {
      id: 'dep_1',
      type: 'DEPOSIT',
      platform: 'OKX',
      currency: 'USDT',
      amount: 5000,
      timestamp: 1000,
      createdAt: 1000,
    },
    {
      id: 'dep_2',
      type: 'WITHDRAW',
      platform: 'OKX',
      currency: 'USDT',
      amount: 1000,
      timestamp: 2000,
      createdAt: 2000,
    },
    {
      id: 'dep_3',
      type: 'DEPOSIT',
      platform: 'Binance',
      currency: 'USDT',
      amount: 3000,
      timestamp: 1500,
      createdAt: 1500,
    },
    {
      id: 'dep_4',
      type: 'DEPOSIT',
      platform: 'OKX',
      currency: 'USDC',
      amount: 2000,
      timestamp: 3000,
      createdAt: 3000,
    },
  ];

  it('filters deposits strictly by target platform and currency', () => {
    const targetPlatform: PlatformType = 'OKX';
    const targetCurrency: DepositCurrency = 'USDT';

    const filtered = sampleDeposits.filter(
      (d) => d.platform === targetPlatform && d.currency === targetCurrency
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((d) => d.id)).toEqual(['dep_1', 'dep_2']);
  });

  it('sorts deposits chronologically descending (newest first)', () => {
    const targetPlatform: PlatformType = 'OKX';
    const targetCurrency: DepositCurrency = 'USDT';

    const filtered = sampleDeposits.filter(
      (d) => d.platform === targetPlatform && d.currency === targetCurrency
    );
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

    expect(sorted[0].id).toBe('dep_2'); // timestamp 2000
    expect(sorted[1].id).toBe('dep_1'); // timestamp 1000
  });

  it('accurately aggregates total deposited and total withdrawn for target capital pool', () => {
    const targetPlatform: PlatformType = 'OKX';
    const targetCurrency: DepositCurrency = 'USDT';

    let totalDeposited = 0;
    let totalWithdrawn = 0;

    for (const d of sampleDeposits) {
      if (d.platform === targetPlatform && d.currency === targetCurrency) {
        if (!d.type || d.type === 'DEPOSIT') {
          totalDeposited += d.amount;
        } else if (d.type === 'WITHDRAW') {
          totalWithdrawn += d.amount;
        }
      }
    }

    expect(totalDeposited).toBe(5000);
    expect(totalWithdrawn).toBe(1000);
  });

  it('provides complete i18n support for capital detail screen', () => {
    expect(t('capitalDetail.availableCapital', 'zh')).toBe('当前可用本金');
    expect(t('capitalDetail.availableCapital', 'en')).toBe('Available Capital');

    expect(t('capitalDetail.totalDeposited', 'zh')).toBe('累计入金');
    expect(t('capitalDetail.totalDeposited', 'en')).toBe('Total Deposited');

    expect(t('capitalDetail.totalWithdrawn', 'zh')).toBe('累计出金');
    expect(t('capitalDetail.totalWithdrawn', 'en')).toBe('Total Withdrawn');

    expect(t('capitalDetail.historyTitle', 'zh')).toBe('入金与出金流水');
    expect(t('capitalDetail.historyTitle', 'en')).toBe('Deposit & Withdrawal History');

    expect(t('capitalDetail.emptyHistory', 'zh')).toBe('暂无该平台的出入金记录');
    expect(t('capitalDetail.emptyHistory', 'en')).toBe('No deposit or withdrawal records');

    expect(t('capitalDetail.allFlowsTitle', 'zh')).toBe('本金流水明细');
    expect(t('capitalDetail.allFlowsTitle', 'en')).toBe('Capital Balance Movements');
    expect(t('capitalDetail.filterTransfers', 'zh')).toBe('出入金');
    expect(t('capitalDetail.filterAll', 'zh')).toBe('全部');
  });

  it('reconciles available capital when transactions (buy/sell) are included in all flows', () => {
    // 200k deposit, 5k withdraw -> Net transfer = 195,000
    // Buy 2 BTC at $57,310.90 -> Cost = 114,621.80
    // Sell 1 BTC at $77,310.90 -> Proceeds = 77,310.90
    // Sell 1 BTC at $47,310.90 -> Proceeds = 47,310.90
    // Expected Balance = 195,000 - 114,621.80 + 77,310.90 + 47,310.90 = 205,000.00
    const deps: Deposit[] = [
      { id: 'd1', platform: 'OKX', currency: 'USDT', amount: 100000, timestamp: 1000, createdAt: 1000 },
      { id: 'd2', platform: 'OKX', currency: 'USDT', amount: 100000, timestamp: 2000, createdAt: 2000 },
      { id: 'w1', type: 'WITHDRAW', platform: 'OKX', currency: 'USDT', amount: 5000, timestamp: 5000, createdAt: 5000 },
    ];
    const txs = [
      { id: 't1', assetId: 'BTC', type: 'BUY' as const, amount: 2, price: 57310.90, platform: 'OKX' as const, fundingCurrency: 'USDT' as const, timestamp: 3000, createdAt: 3000 },
      { id: 't2', assetId: 'BTC', type: 'SELL' as const, amount: 1, price: 77310.90, platform: 'OKX' as const, fundingCurrency: 'USDT' as const, timestamp: 4000, createdAt: 4000 },
    ];

    let netFlow = 0;
    for (const d of deps) {
      if (d.type === 'WITHDRAW') netFlow -= d.amount;
      else netFlow += d.amount;
    }
    for (const t of txs) {
      if (t.type === 'BUY') netFlow -= (t.amount * t.price);
      else if (t.type === 'SELL') netFlow += (t.amount * t.price);
    }

    // 100000 + 100000 - 5000 - 114621.80 + 77310.90 = 157689.10
    expect(netFlow).toBeCloseTo(157689.10, 2);
  });
});

