import { PnLEngine } from '../src/domain/calculations/pnlEngine';
import { Transaction } from '../src/domain/types';

describe('PnLEngine.calculateTransactionPnLList (逐笔交易已实现盈亏与成本分析)', () => {
  it('能够准确核算用户反馈场景：单次买入2个BTC，第一次卖出赚20000，第二次卖出亏10000，总盈利10000', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-buy-1',
        assetId: 'btc-okx',
        platform: 'OKX',
        type: 'BUY',
        amount: 2,
        price: 57310.90,
        fee: 0,
        timestamp: 1773400860000, // 2:01 PM
        createdAt: 1773400860000,
      },
      {
        id: 'tx-sell-1',
        assetId: 'btc-okx',
        platform: 'OKX',
        type: 'SELL',
        amount: 1,
        price: 77310.90,
        fee: 0,
        timestamp: 1773400920000, // 2:02 PM
        createdAt: 1773400920000,
      },
      {
        id: 'tx-sell-2',
        assetId: 'btc-okx',
        platform: 'OKX',
        type: 'SELL',
        amount: 1,
        price: 47310.90,
        fee: 0,
        timestamp: 1773400920000, // 2:02 PM (同分钟，创建时间稍晚)
        createdAt: 1773400920050,
      },
    ];

    const pnlMap = PnLEngine.calculateTransactionPnLList(txs);

    // 1. 买入单检验
    const buyInfo = pnlMap.get('tx-buy-1');
    expect(buyInfo).toBeDefined();
    expect(buyInfo?.buyCostUSD).toBeCloseTo(114621.80, 2);
    expect(buyInfo?.holdingAvgCostAfterBuy).toBeCloseTo(57310.90, 2);

    // 2. 第一次卖出单检验 (赚 20,000)
    const sell1Info = pnlMap.get('tx-sell-1');
    expect(sell1Info).toBeDefined();
    expect(sell1Info?.costBasisAtSale).toBeCloseTo(57310.90, 2);
    expect(sell1Info?.realizedPnL).toBeCloseTo(20000.00, 2);
    expect(sell1Info?.realizedPnLPercent).toBeCloseTo(34.8978, 2);

    // 3. 第二次卖出单检验 (亏 10,000)
    const sell2Info = pnlMap.get('tx-sell-2');
    expect(sell2Info).toBeDefined();
    expect(sell2Info?.costBasisAtSale).toBeCloseTo(57310.90, 2);
    expect(sell2Info?.realizedPnL).toBeCloseTo(-10000.00, 2);
    expect(sell2Info?.realizedPnLPercent).toBeCloseTo(-17.4487, 2);

    // 4. 总已实现盈亏累加检验
    const totalRealized = (sell1Info?.realizedPnL || 0) + (sell2Info?.realizedPnL || 0);
    expect(totalRealized).toBeCloseTo(10000.00, 2);
  });

  it('多次加仓后分批卖出时，根据移动加权平均成本精准核算每笔盈亏', () => {
    const txs: Transaction[] = [
      // 第一次以 50,000 买入 1 个
      {
        id: 'b1',
        assetId: 'btc',
        platform: 'OKX',
        type: 'BUY',
        amount: 1,
        price: 50000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      // 第二次以 70,000 买入 1 个 -> 持仓 2 个，均价变为 60,000
      {
        id: 'b2',
        assetId: 'btc',
        platform: 'OKX',
        type: 'BUY',
        amount: 1,
        price: 70000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
      // 第一次卖出 1 个 @ 65,000 -> 成本 60,000，盈利 +5,000 (+8.33%)
      {
        id: 's1',
        assetId: 'btc',
        platform: 'OKX',
        type: 'SELL',
        amount: 1,
        price: 65000,
        fee: 0,
        timestamp: 3000,
        createdAt: 3000,
      },
      // 第二次卖出 1 个 @ 55,000 -> 成本 60,000，亏损 -5,000 (-8.33%)
      {
        id: 's2',
        assetId: 'btc',
        platform: 'OKX',
        type: 'SELL',
        amount: 1,
        price: 55000,
        fee: 0,
        timestamp: 4000,
        createdAt: 4000,
      },
    ];

    const pnlMap = PnLEngine.calculateTransactionPnLList(txs);

    const s1 = pnlMap.get('s1');
    expect(s1?.costBasisAtSale).toBeCloseTo(60000, 2);
    expect(s1?.realizedPnL).toBeCloseTo(5000, 2);
    expect(s1?.realizedPnLPercent).toBeCloseTo(8.3333, 2);

    const s2 = pnlMap.get('s2');
    expect(s2?.costBasisAtSale).toBeCloseTo(60000, 2);
    expect(s2?.realizedPnL).toBeCloseTo(-5000, 2);
    expect(s2?.realizedPnLPercent).toBeCloseTo(-8.3333, 2);

    expect((s1?.realizedPnL || 0) + (s2?.realizedPnL || 0)).toBe(0);
  });

  it('卖出扣减手续费时，单笔已实现盈亏正确扣除手续费', () => {
    const txs: Transaction[] = [
      {
        id: 'b1',
        assetId: 'btc',
        platform: 'OKX',
        type: 'BUY',
        amount: 1,
        price: 60000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: 's1',
        assetId: 'btc',
        platform: 'OKX',
        type: 'SELL',
        amount: 1,
        price: 65000,
        fee: 100, // 手续费 $100
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    const pnlMap = PnLEngine.calculateTransactionPnLList(txs);
    const s1 = pnlMap.get('s1');
    expect(s1?.costBasisAtSale).toBe(60000);
    // 毛利 5,000 - 手续费 100 = 净已实现盈亏 4,900
    expect(s1?.realizedPnL).toBe(4900);
  });

  it('超卖容错：卖出数量超出持仓时优雅截断并标记 isOversell', () => {
    const txs: Transaction[] = [
      {
        id: 'b1',
        assetId: 'btc',
        platform: 'OKX',
        type: 'BUY',
        amount: 1,
        price: 60000,
        fee: 0,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: 's1',
        assetId: 'btc',
        platform: 'OKX',
        type: 'SELL',
        amount: 2, // 尝试卖 2 个，只有 1 个
        price: 70000,
        fee: 0,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    const pnlMap = PnLEngine.calculateTransactionPnLList(txs);
    const s1 = pnlMap.get('s1');
    expect(s1?.isOversell).toBe(true);
    expect(s1?.validAmount).toBe(1);
    expect(s1?.realizedPnL).toBe(10000);
  });

  it('不同平台资金隔离核算', () => {
    const txs: Transaction[] = [
      {
        id: 'okx-buy',
        assetId: 'btc',
        platform: 'OKX',
        type: 'BUY',
        amount: 1,
        price: 50000,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: 'binance-buy',
        assetId: 'btc',
        platform: 'Binance',
        type: 'BUY',
        amount: 1,
        price: 80000,
        timestamp: 1000,
        createdAt: 1000,
      },
      {
        id: 'okx-sell',
        assetId: 'btc',
        platform: 'OKX',
        type: 'SELL',
        amount: 1,
        price: 60000,
        timestamp: 2000,
        createdAt: 2000,
      },
    ];

    const pnlMap = PnLEngine.calculateTransactionPnLList(txs);
    const okxSell = pnlMap.get('okx-sell');
    // OKX 成本是 50,000，而不是受币安 80,000 影响
    expect(okxSell?.costBasisAtSale).toBe(50000);
    expect(okxSell?.realizedPnL).toBe(10000);
  });
});
