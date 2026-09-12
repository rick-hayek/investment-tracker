import BigNumber from 'bignumber.js';
import { Asset, Transaction, AssetHolding, PortfolioSummary } from '../types';

/**
 * 设置 BigNumber 精度与舍入规则
 * 统一保留足够的小数位，保证加密货币 8 位小数以及超小额代币不发生精度失真
 */
BigNumber.config({
  DECIMAL_PLACES: 20,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
  EXPONENTIAL_AT: [-10, 20],
});

/**
 * 核心财务与盈亏计算引擎
 */
export class PnLEngine {
  /**
   * 计算买入后的加权平均持仓成本均价
   * 
   * 公式: P_new = (Q_prev * P_prev + Q_buy * P_buy) / (Q_prev + Q_buy)
   */
  public static calculateWeightedAverageCost(
    previousHolding: number | string | BigNumber,
    previousAvgCost: number | string | BigNumber,
    buyAmount: number | string | BigNumber,
    buyPrice: number | string | BigNumber
  ): number {
    const qPrev = new BigNumber(previousHolding);
    const pPrev = new BigNumber(previousAvgCost);
    const qBuy = new BigNumber(buyAmount);
    const pBuy = new BigNumber(buyPrice);

    const totalQty = qPrev.plus(qBuy);
    if (totalQty.isLessThanOrEqualTo(0)) {
      return 0;
    }

    const previousTotalCost = qPrev.multipliedBy(pPrev);
    const newBuyCost = qBuy.multipliedBy(pBuy);
    const newTotalCost = previousTotalCost.plus(newBuyCost);

    return newTotalCost.dividedBy(totalQty).toNumber();
  }

  /**
   * 计算当前未实现盈亏及收益率
   * 
   * 未实现盈亏 = (当前市价 - 持仓均价) * 当前持币量
   * 未实现收益率 = ((当前市价 - 持仓均价) / 持仓均价) * 100%
   */
  public static calculateUnrealizedPnL(
    currentPrice: number | string | BigNumber,
    averageCost: number | string | BigNumber,
    holdingQuantity: number | string | BigNumber
  ): { pnlAmount: number; pnlPercent: number } {
    const curPrice = new BigNumber(currentPrice);
    const avgCost = new BigNumber(averageCost);
    const qty = new BigNumber(holdingQuantity);

    if (qty.isLessThanOrEqualTo(0) || avgCost.isLessThanOrEqualTo(0)) {
      return { pnlAmount: 0, pnlPercent: 0 };
    }

    const priceDiff = curPrice.minus(avgCost);
    const pnlAmount = priceDiff.multipliedBy(qty);
    const pnlPercent = priceDiff.dividedBy(avgCost).multipliedBy(100);

    return {
      pnlAmount: pnlAmount.toNumber(),
      pnlPercent: pnlPercent.toNumber(),
    };
  }

  /**
   * 计算单笔卖出时的已实现盈亏结转
   * 
   * 已实现盈亏 = (卖出单价 - 持仓均价) * 卖出数量 - 手续费
   */
  public static calculateRealizedPnL(
    sellPrice: number | string | BigNumber,
    averageCost: number | string | BigNumber,
    sellAmount: number | string | BigNumber,
    fee: number | string | BigNumber = 0
  ): number {
    const pSell = new BigNumber(sellPrice);
    const pAvg = new BigNumber(averageCost);
    const qSell = new BigNumber(sellAmount);
    const txFee = new BigNumber(fee || 0);

    const grossProfit = pSell.minus(pAvg).multipliedBy(qSell);
    return grossProfit.minus(txFee).toNumber();
  }

  /**
   * 交易合法性检查（防超卖、防无效数值）
   */
  public static validateTransaction(
    type: 'BUY' | 'SELL',
    amount: number | string,
    price: number | string,
    currentAvailableHolding: number | string = 0
  ): { valid: boolean; error?: string } {
    const qAmount = new BigNumber(amount);
    const qPrice = new BigNumber(price);
    const qHolding = new BigNumber(currentAvailableHolding);

    if (qAmount.isNaN() || qAmount.isLessThanOrEqualTo(0)) {
      return { valid: false, error: '交易数量必须大于 0' };
    }

    if (qPrice.isNaN() || qPrice.isLessThan(0)) {
      return { valid: false, error: '成交价格不能小于 0' };
    }

    if (type === 'SELL') {
      if (qAmount.isGreaterThan(qHolding)) {
        return {
          valid: false,
          error: `卖出数量 (${qAmount.toString()}) 超出当前持仓可用量 (${qHolding.toString()})`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * 从指定币种的全量历史买卖交易流水中，重构并计算当前持仓状态与盈亏
   */
  public static calculateHoldingFromTransactions(
    asset: Asset,
    transactions: Transaction[],
    currentPrice: number,
    change24hPercent: number = 0
  ): AssetHolding {
    // 按成交时间戳升序排序 (历史 -> 当前)
    const sortedTx = [...transactions].sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.createdAt - b.createdAt;
    });

    let currentQty = new BigNumber(0);
    let avgCost = new BigNumber(0);
    let totalRealizedPnL = new BigNumber(0);

    for (const tx of sortedTx) {
      const txAmount = new BigNumber(tx.amount);
      const txPrice = new BigNumber(tx.price);
      const txFee = new BigNumber(tx.fee || 0);

      if (tx.type === 'BUY') {
        // 买入更新加权均价与持有量
        const newAvg = this.calculateWeightedAverageCost(
          currentQty,
          avgCost,
          txAmount,
          txPrice
        );
        avgCost = new BigNumber(newAvg);
        currentQty = currentQty.plus(txAmount);
      } else if (tx.type === 'SELL') {
        // 卖出流水防崩溃与超卖容错处理：若流水中卖出数量超出持仓，优雅截断并记录日志，避免抛出未捕获异常导致 UI 崩溃
        let validSellAmount = txAmount;
        if (txAmount.isGreaterThan(currentQty)) {
          console.warn(
            `[PnLEngine] Oversell detected for ${asset.symbol}: sell amount (${txAmount.toString()}) exceeds available holding (${currentQty.toString()}). Gracefully capped.`
          );
          validSellAmount = currentQty;
        }

        // 结转已实现盈亏 (基于实际扣减的持仓数量)
        const realized = this.calculateRealizedPnL(
          txPrice,
          avgCost,
          validSellAmount,
          txFee
        );
        totalRealizedPnL = totalRealizedPnL.plus(realized);

        // 扣减持仓量，均价不变
        currentQty = currentQty.minus(validSellAmount);

        // 若完全清仓，均价归零
        if (currentQty.isZero()) {
          avgCost = new BigNumber(0);
        }
      }
    }

    const curPriceBn = new BigNumber(currentPrice);
    const marketValue = currentQty.multipliedBy(curPriceBn);
    const totalCostBasis = currentQty.multipliedBy(avgCost);

    const { pnlAmount: unrealizedPnL, pnlPercent: unrealizedPnLPercent } =
      this.calculateUnrealizedPnL(currentPrice, avgCost, currentQty);

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      platform: asset.platform,
      totalQuantity: currentQty.toNumber(),
      averageCost: avgCost.toNumber(),
      totalCostBasis: totalCostBasis.toNumber(),
      currentPrice: currentPrice,
      marketValue: marketValue.toNumber(),
      unrealizedPnL: unrealizedPnL,
      unrealizedPnLPercent: unrealizedPnLPercent,
      realizedPnL: totalRealizedPnL.toNumber(),
      change24hPercent: change24hPercent,
    };
  }

  /**
   * 汇总所有代币持仓，计算投资组合总价值、总成本与总盈亏看板
   */
  public static calculatePortfolioSummary(
    holdings: AssetHolding[]
  ): PortfolioSummary {
    let totalMarketValue = new BigNumber(0);
    let totalCostBasis = new BigNumber(0);
    let totalUnrealizedPnL = new BigNumber(0);
    let totalRealizedPnL = new BigNumber(0);

    for (const h of holdings) {
      totalMarketValue = totalMarketValue.plus(h.marketValue);
      totalCostBasis = totalCostBasis.plus(h.totalCostBasis);
      totalUnrealizedPnL = totalUnrealizedPnL.plus(h.unrealizedPnL);
      totalRealizedPnL = totalRealizedPnL.plus(h.realizedPnL);
    }

    const netProfit = totalUnrealizedPnL.plus(totalRealizedPnL);

    // 未实现盈亏率: totalUnrealizedPnL / totalCostBasis
    let totalUnrealizedPnLPercent = 0;
    if (totalCostBasis.isGreaterThan(0)) {
      totalUnrealizedPnLPercent = totalUnrealizedPnL
        .dividedBy(totalCostBasis)
        .multipliedBy(100)
        .toNumber();
    }

    // 累计投资净回报率
    let netProfitPercent = 0;
    if (totalCostBasis.isGreaterThan(0)) {
      netProfitPercent = netProfit
        .dividedBy(totalCostBasis)
        .multipliedBy(100)
        .toNumber();
    }

    return {
      totalMarketValue: totalMarketValue.toNumber(),
      totalCostBasis: totalCostBasis.toNumber(),
      totalUnrealizedPnL: totalUnrealizedPnL.toNumber(),
      totalUnrealizedPnLPercent: totalUnrealizedPnLPercent,
      totalRealizedPnL: totalRealizedPnL.toNumber(),
      netProfit: netProfit.toNumber(),
      netProfitPercent: netProfitPercent,
      assetHoldings: holdings,
    };
  }
}
