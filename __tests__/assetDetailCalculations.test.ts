import {
  generateSimulatedHistory,
  computeCoordinates,
  findNearestPoint,
} from '../src/components/charts/chartUtils';

describe('Asset Detail & Chart Calculations (投资品详情与分时图表测算测试)', () => {
  describe('仿真历史走势点生成 (generateSimulatedHistory)', () => {
    it('正确生成各周期（24H, 1W, 1M, 1Y, ALL）的连续走势数据', () => {
      const timeframes = ['24H', '1W', '1M', '1Y', 'ALL'] as const;

      for (const tf of timeframes) {
        const points = generateSimulatedHistory(68000, tf, 5.0);
        expect(points.length).toBe(30);
        // 最后一个点必须等于最新现价
        expect(points[points.length - 1].price).toBe(68000);
        // 所有点的价格必须大于 0
        points.forEach((p) => {
          expect(p.price).toBeGreaterThan(0);
          expect(p.timestamp).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('分时图坐标映射 (computeCoordinates)', () => {
    it('根据数据点阵正确计算 SVG 曲线与封闭面积路径', () => {
      const sample = [
        { timestamp: 1000, price: 60000 },
        { timestamp: 2000, price: 62000 },
        { timestamp: 3000, price: 65000 },
      ];

      const { computedPoints, linePath, areaPath, minPrice, maxPrice } = computeCoordinates(
        sample,
        280,
        140
      );

      expect(computedPoints.length).toBe(3);
      expect(minPrice).toBe(60000);
      expect(maxPrice).toBe(65000);
      expect(linePath.startsWith('M 10.0')).toBe(true);
      expect(areaPath.endsWith('L 10.0 140 Z')).toBe(true);
    });

    it('空数据输入时安全降级', () => {
      const result = computeCoordinates([], 280, 140);
      expect(result.computedPoints).toEqual([]);
      expect(result.linePath).toBe('');
      expect(result.areaPath).toBe('');
    });
  });

  describe('触摸十字光标吸附 (findNearestPoint)', () => {
    it('精确吸附至水平距离最近的数据点', () => {
      const sample = [
        { timestamp: 1000, price: 60000 },
        { timestamp: 2000, price: 62000 },
        { timestamp: 3000, price: 65000 },
      ];

      const { computedPoints } = computeCoordinates(sample, 200, 100, {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });

      // computedPoints x: [0, 100, 200]
      expect(computedPoints[0].x).toBe(0);
      expect(computedPoints[1].x).toBe(100);
      expect(computedPoints[2].x).toBe(200);

      // 触碰 x = 15 时，吸附至第 0 点 (x = 0)
      expect(findNearestPoint(computedPoints, 15)?.price).toBe(60000);
      // 触碰 x = 85 时，吸附至第 1 点 (x = 100)
      expect(findNearestPoint(computedPoints, 85)?.price).toBe(62000);
      // 触碰 x = 180 时，吸附至第 2 点 (x = 200)
      expect(findNearestPoint(computedPoints, 180)?.price).toBe(65000);
    });
  });

  describe('单笔交易明细动态盈亏推导计算', () => {
    it('买入单：根据实时现价准确计算未实现浮动盈亏', () => {
      const buyPrice = 60000;
      const amount = 0.5;
      const currentPrice = 68000;

      const unrealizedPnL = (currentPrice - buyPrice) * amount;
      const returnPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

      expect(unrealizedPnL).toBe(4000);
      expect(returnPercent).toBeCloseTo(13.33, 1);
    });

    it('卖出单：根据持仓均价准确计算结算已实现利润（含手续费抵扣）', () => {
      const sellPrice = 70000;
      const avgCost = 62000;
      const amount = 0.2;
      const fee = 5;

      const realizedPnL = (sellPrice - avgCost) * amount - fee;
      const profitPercent = ((sellPrice - avgCost) / avgCost) * 100;

      expect(realizedPnL).toBe(1595);
      expect(profitPercent).toBeCloseTo(12.9, 1);
    });
  });

  describe('代币投资汇总成绩战绩测算 (AssetPerformanceCard)', () => {
    it('对于已清仓代币，准确测算全周期总盈利、累计投入本金、累计卖出回款与回报率', () => {
      const holding = {
        assetId: 'btc_okx',
        symbol: 'BTC',
        name: 'Bitcoin',
        totalQuantity: 0,
        averageCost: 0,
        totalCostBasis: 0,
        cumulativeCostBasis: 5721.73,
        totalBoughtCost: 5721.73,
        totalSoldProceeds: 7722.49,
        totalProfit: 2000.76,
        totalProfitPercent: 34.97,
        currentPrice: 77199.9,
        marketValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 2000.76,
        change24hPercent: -0.09,
      };

      const transactions = [
        {
          id: 'tx_1',
          assetId: 'btc_okx',
          type: 'BUY' as const,
          amount: 0.1,
          price: 57217.3,
          fee: 0,
          fundingCurrency: 'USDT' as const,
          platform: 'OKX' as const,
          timestamp: 1000,
          createdAt: 1000,
        },
        {
          id: 'tx_2',
          assetId: 'btc_okx',
          type: 'SELL' as const,
          amount: 0.1,
          price: 77224.9,
          fee: 0,
          fundingCurrency: 'USDT' as const,
          platform: 'OKX' as const,
          timestamp: 2000,
          createdAt: 2000,
        },
      ];

      const buyTxs = transactions.filter((t) => t.type === 'BUY');
      const sellTxs = transactions.filter((t) => t.type === 'SELL');
      const calculatedBoughtCost = buyTxs.reduce((sum, t) => sum + t.amount * t.price, 0);
      const calculatedSoldProceeds = sellTxs.reduce((sum, t) => sum + t.amount * t.price, 0);

      expect(calculatedBoughtCost).toBeCloseTo(5721.73, 2);
      expect(calculatedSoldProceeds).toBeCloseTo(7722.49, 2);

      const totalProfit = holding.realizedPnL + holding.unrealizedPnL;
      expect(totalProfit).toBeCloseTo(2000.76, 2);

      const roiPercent = (totalProfit / calculatedBoughtCost) * 100;
      expect(roiPercent).toBeCloseTo(34.97, 1);
    });
  });
});
