import BigNumber from 'bignumber.js';
import { Asset, Transaction, AssetHolding, PortfolioSummary, Deposit, DepositCurrency, PlatformType, TransactionPnLInfo } from '../types';

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
   * 买入交易本金充足性与平台资金隔离强校验
   */
  public static validateBuyCapital(
    platform: PlatformType,
    currency: DepositCurrency,
    cost: number | string | BigNumber,
    availableBalance: number | string | BigNumber | Record<PlatformType, { usdt: number; usdc: number; totalUSD: number }> | undefined
  ): { valid: boolean; error?: string; shortfall: number } {
    let balNumber: number | string | BigNumber = 0;
    if (availableBalance && typeof availableBalance === 'object' && !(availableBalance instanceof BigNumber)) {
      const platBal = (availableBalance as any)[platform];
      if (platBal) {
        balNumber = currency === 'USDC' ? platBal.usdc : platBal.usdt;
      } else {
        balNumber = 0;
      }
    } else if (availableBalance !== undefined) {
      balNumber = availableBalance;
    }

    const qCost = new BigNumber(cost);
    const qBal = new BigNumber(balNumber);

    if (qCost.isNaN() || qCost.isLessThanOrEqualTo(0)) {
      return { valid: false, error: '买入总花费必须大于 0', shortfall: 0 };
    }

    if (qCost.isGreaterThan(qBal)) {
      const shortfall = qCost.minus(qBal).toNumber();
      return {
        valid: false,
        error: `当前 ${platform} 平台 ${currency} 可用本金不足 (缺少 $${shortfall.toFixed(2)})`,
        shortfall,
      };
    }

    return { valid: true, shortfall: 0 };
  }

  /**
   * 提现本金充足性与可用余额强校验
   */
  public static validateWithdrawCapital(
    platform: PlatformType,
    currency: DepositCurrency,
    amount: number | string | BigNumber,
    availableBalance: number | string | BigNumber | Record<PlatformType, { usdt: number; usdc: number; totalUSD: number }> | undefined
  ): { valid: boolean; error?: string; available: number } {
    let balNumber: number | string | BigNumber = 0;
    if (availableBalance && typeof availableBalance === 'object' && !(availableBalance instanceof BigNumber)) {
      const platBal = (availableBalance as any)[platform];
      if (platBal) {
        balNumber = currency === 'USDC' ? platBal.usdc : platBal.usdt;
      } else {
        balNumber = 0;
      }
    } else if (availableBalance !== undefined) {
      balNumber = availableBalance;
    }

    const qAmount = new BigNumber(amount);
    const qBal = new BigNumber(balNumber);

    if (qAmount.isNaN() || qAmount.isLessThanOrEqualTo(0)) {
      return { valid: false, error: '提现金额必须大于 0', available: qBal.toNumber() };
    }

    if (qAmount.isGreaterThan(qBal)) {
      return {
        valid: false,
        error: `当前 ${platform} 平台 ${currency} 可用本金不足 (最大可提现 $${qBal.toFixed(2)})`,
        available: qBal.toNumber(),
      };
    }

    return { valid: true, available: qBal.toNumber() };
  }

  /**
   * 计算各交易所的可用稳定币本金余额 (USDT 与 USDC)
   * 
   * 公式: Balance(E, S) = Sum(Deposits) - Sum(Withdrawals) - Sum(Buy Costs) + Sum(Sell Proceeds)
   * 平台资金严格物理隔离，各交易所独立核算
   */
  public static calculatePlatformBalances(
    deposits: Deposit[] = [],
    transactions: Transaction[] = []
  ): Record<PlatformType, { usdt: number; usdc: number; totalUSD: number }> {
    const platforms: PlatformType[] = ['OKX', 'Binance', 'CoinGecko', 'Coinbase'];
    const balances: Record<PlatformType, { usdt: BigNumber; usdc: BigNumber }> = {
      OKX: { usdt: new BigNumber(0), usdc: new BigNumber(0) },
      Binance: { usdt: new BigNumber(0), usdc: new BigNumber(0) },
      CoinGecko: { usdt: new BigNumber(0), usdc: new BigNumber(0) },
      Coinbase: { usdt: new BigNumber(0), usdc: new BigNumber(0) },
    };

    // 1. 注入充值本金 / 扣减提现本金
    for (const d of deposits) {
      if (balances[d.platform]) {
        const amt = new BigNumber(d.amount || 0);
        const isWithdraw = d.type === 'WITHDRAW';
        if (d.currency === 'USDC') {
          balances[d.platform].usdc = isWithdraw
            ? balances[d.platform].usdc.minus(amt)
            : balances[d.platform].usdc.plus(amt);
        } else {
          balances[d.platform].usdt = isWithdraw
            ? balances[d.platform].usdt.minus(amt)
            : balances[d.platform].usdt.plus(amt);
        }
      }
    }

    // 2. 扣减买入花费 / 增加卖出回笼资金
    for (const tx of transactions) {
      if (balances[tx.platform]) {
        const amount = new BigNumber(tx.amount || 0);
        const price = new BigNumber(tx.price || 0);
        const fee = new BigNumber(tx.fee || 0);
        const tradeVal = amount.multipliedBy(price);
        const cur = tx.fundingCurrency === 'USDC' ? 'usdc' : 'usdt';

        if (tx.type === 'BUY') {
          const totalCost = tradeVal.plus(fee);
          balances[tx.platform][cur] = balances[tx.platform][cur].minus(totalCost);
        } else if (tx.type === 'SELL') {
          const netProceeds = tradeVal.minus(fee);
          balances[tx.platform][cur] = balances[tx.platform][cur].plus(netProceeds);
        }
      }
    }

    // 3. 转换为纯数值，并计算总折合 USD
    const result: Record<PlatformType, { usdt: number; usdc: number; totalUSD: number }> = {} as any;
    for (const p of platforms) {
      const usdt = balances[p].usdt.toNumber();
      const usdc = balances[p].usdc.toNumber();
      const totalUSD = balances[p].usdt.plus(balances[p].usdc).toNumber();
      result[p] = { usdt, usdc, totalUSD };
    }

    return result;
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
      // 若时间戳相同，买入必须在卖出之前处理
      if (a.type !== b.type) {
        return a.type === 'BUY' ? -1 : 1;
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    let currentQty = new BigNumber(0);
    let avgCost = new BigNumber(0);
    let totalRealizedPnL = new BigNumber(0);
    let totalSoldCostBasis = new BigNumber(0);
    let totalBoughtCost = new BigNumber(0);
    let totalSoldProceeds = new BigNumber(0);

    for (const tx of sortedTx) {
      const txAmount = new BigNumber(tx.amount);
      const txPrice = new BigNumber(tx.price);
      const txFee = new BigNumber(tx.fee || 0);

      if (tx.type === 'BUY') {
        const tradeCost = txAmount.multipliedBy(txPrice).plus(txFee);
        totalBoughtCost = totalBoughtCost.plus(tradeCost);

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

        // 累加已卖出持仓的成本本金
        const soldCost = validSellAmount.multipliedBy(avgCost);
        totalSoldCostBasis = totalSoldCostBasis.plus(soldCost);

        const proceeds = validSellAmount.multipliedBy(txPrice).minus(txFee);
        totalSoldProceeds = totalSoldProceeds.plus(proceeds);

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

    // 累计投入成本: 已卖出成本 + 当前持仓成本; 若未追踪到则回退到买入总额
    const calculatedCumulative = totalCostBasis.plus(totalSoldCostBasis);
    const cumulativeCostBasis = calculatedCumulative.isGreaterThan(0)
      ? calculatedCumulative
      : totalBoughtCost;

    const { pnlAmount: unrealizedPnL, pnlPercent: unrealizedPnLPercent } =
      this.calculateUnrealizedPnL(currentPrice, avgCost, currentQty);

    // 计算代币全周期总利润与投资回报率
    const totalProfitBn = totalRealizedPnL.plus(unrealizedPnL);
    let totalProfitPercent = 0;
    const costForRoi = cumulativeCostBasis.isGreaterThan(0)
      ? cumulativeCostBasis
      : totalBoughtCost;
    if (costForRoi.isGreaterThan(0)) {
      totalProfitPercent = totalProfitBn
        .dividedBy(costForRoi)
        .multipliedBy(100)
        .toNumber();
    }

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      platform: asset.platform,
      totalQuantity: currentQty.toNumber(),
      averageCost: avgCost.toNumber(),
      totalCostBasis: totalCostBasis.toNumber(),
      cumulativeCostBasis: cumulativeCostBasis.toNumber(),
      totalBoughtCost: totalBoughtCost.toNumber(),
      totalSoldProceeds: totalSoldProceeds.toNumber(),
      totalProfit: totalProfitBn.toNumber(),
      totalProfitPercent: totalProfitPercent,
      currentPrice: currentPrice,
      marketValue: marketValue.toNumber(),
      unrealizedPnL: unrealizedPnL,
      unrealizedPnLPercent: unrealizedPnLPercent,
      realizedPnL: totalRealizedPnL.toNumber(),
      change24hPercent: change24hPercent,
      iconUrl: asset.iconUrl,
    };
  }

  /**
   * 汇总所有代币持仓及多交易所本金，计算投资组合全平台总财产、总成本与总盈亏看板
   */
  public static calculatePortfolioSummary(
    holdings: AssetHolding[],
    deposits: Deposit[] = [],
    transactions: Transaction[] = []
  ): PortfolioSummary {
    let totalCryptoMarketValue = new BigNumber(0);
    let totalCostBasis = new BigNumber(0);
    let totalCumulativeCostBasis = new BigNumber(0);
    let totalUnrealizedPnL = new BigNumber(0);
    let totalRealizedPnL = new BigNumber(0);

    for (const h of holdings) {
      totalCryptoMarketValue = totalCryptoMarketValue.plus(h.marketValue);
      totalCostBasis = totalCostBasis.plus(h.totalCostBasis);
      const hCumulative = (h.cumulativeCostBasis && h.cumulativeCostBasis > 0)
        ? h.cumulativeCostBasis
        : ((h.totalBoughtCost && h.totalBoughtCost > 0) ? h.totalBoughtCost : h.totalCostBasis);
      totalCumulativeCostBasis = totalCumulativeCostBasis.plus(hCumulative);
      totalUnrealizedPnL = totalUnrealizedPnL.plus(h.unrealizedPnL);
      totalRealizedPnL = totalRealizedPnL.plus(h.realizedPnL);
    }

    const netProfit = totalUnrealizedPnL.plus(totalRealizedPnL);

    // 计算各平台本金与全平台现金储备
    const platformBalances = this.calculatePlatformBalances(deposits, transactions);
    let totalCashReservesBn = new BigNumber(0);
    for (const p of Object.values(platformBalances)) {
      totalCashReservesBn = totalCashReservesBn.plus(p.totalUSD);
    }

    // 累计净充值总额 (充值 - 提现)
    let totalNetDepositsBn = new BigNumber(0);
    for (const d of deposits) {
      const amt = new BigNumber(d.amount || 0);
      if (d.type === 'WITHDRAW') {
        totalNetDepositsBn = totalNetDepositsBn.minus(amt);
      } else {
        totalNetDepositsBn = totalNetDepositsBn.plus(amt);
      }
    }

    // 全平台总财产 = 代币持仓市值 + 稳定币可用本金
    const totalPortfolioValueBn = totalCryptoMarketValue.plus(totalCashReservesBn);

    // 全周期投资净盈亏 = 全平台总财产 - 累计净充值
    const totalNetProfitBn = totalPortfolioValueBn.minus(totalNetDepositsBn);
    let totalNetProfitPercent = 0;
    if (totalNetDepositsBn.isGreaterThan(0)) {
      totalNetProfitPercent = totalNetProfitBn
        .dividedBy(totalNetDepositsBn)
        .multipliedBy(100)
        .toNumber();
    }

    // 未实现盈亏率: totalUnrealizedPnL / totalCostBasis
    let totalUnrealizedPnLPercent = 0;
    if (totalCostBasis.isGreaterThan(0)) {
      totalUnrealizedPnLPercent = totalUnrealizedPnL
        .dividedBy(totalCostBasis)
        .multipliedBy(100)
        .toNumber();
    }

    // 代币累计投资净回报率 (基于全周期累计投入成本)
    let netProfitPercent = 0;
    const effectiveCostBasis = totalCumulativeCostBasis.isGreaterThan(0)
      ? totalCumulativeCostBasis
      : (totalCostBasis.isGreaterThan(0)
          ? totalCostBasis
          : (totalNetDepositsBn.isGreaterThan(0) ? totalNetDepositsBn : new BigNumber(0)));
    if (effectiveCostBasis.isGreaterThan(0)) {
      netProfitPercent = netProfit
        .dividedBy(effectiveCostBasis)
        .multipliedBy(100)
        .toNumber();
    }

    // 如果存在充值记录，总财产反映全平台总财产 (代币 + 现金)
    const effectiveTotalMarketValue = deposits.length > 0
      ? totalPortfolioValueBn.toNumber()
      : totalCryptoMarketValue.toNumber();

    // 24小时行情波动指标 (金额变动与涨跌率)
    const daily24h = this.calculate24hChange(
      holdings,
      effectiveTotalMarketValue
    );

    return {
      totalMarketValue: effectiveTotalMarketValue,
      totalCostBasis: totalCostBasis.toNumber(),
      totalCumulativeCostBasis: totalCumulativeCostBasis.toNumber(),
      totalUnrealizedPnL: totalUnrealizedPnL.toNumber(),
      totalUnrealizedPnLPercent: totalUnrealizedPnLPercent,
      totalRealizedPnL: totalRealizedPnL.toNumber(),
      netProfit: netProfit.toNumber(),
      netProfitPercent: netProfitPercent,
      assetHoldings: holdings,
      platformBalances,
      totalCashReservesUSD: totalCashReservesBn.toNumber(),
      totalCryptoMarketValueUSD: totalCryptoMarketValue.toNumber(),
      totalNetDepositsUSD: totalNetDepositsBn.toNumber(),
      totalPortfolioValueUSD: totalPortfolioValueBn.toNumber(),
      totalNetProfitUSD: totalNetProfitBn.toNumber(),
      totalNetProfitPercent: totalNetProfitPercent,
      total24hChangeUSD: daily24h.amountUSD,
      total24hChangePercent: daily24h.percent,
    };
  }

  /**
   * 计算当前持仓在过去 24 小时的行情波动总金额 (USD) 与波动率 %
   * 
   * 严谨数学推导：
   * 各代币 24h 涨跌幅 r = change24hPercent / 100
   * 24h 前单价 P0 = P1 / (1 + r)
   * 24h 前市值 V0 = V1 / (1 + r)
   * 24h 波动金额 DeltaV = V1 - V0
   * 
   * 投资组合 24h 涨跌幅基准为 24h 前总资产：
   * BaseTotal24hAgo = CurrentTotal - TotalDeltaV
   * Portfolio 24h Percent = (TotalDeltaV / BaseTotal24hAgo) * 100%
   */
  public static calculate24hChange(
    holdings: AssetHolding[],
    totalPortfolioValueUSD: number
  ): { amountUSD: number; percent: number } {
    let total24hChangeUSD = new BigNumber(0);

    for (const h of holdings) {
      if (h.marketValue > 0 && typeof h.change24hPercent === 'number' && !isNaN(h.change24hPercent)) {
        const r = h.change24hPercent / 100;
        const mv = new BigNumber(h.marketValue);
        if (r > -1) {
          const baseValue24hAgo = mv.dividedBy(1 + r);
          const changeUSD = mv.minus(baseValue24hAgo);
          total24hChangeUSD = total24hChangeUSD.plus(changeUSD);
        } else {
          // 极端归零跌幅 (r <= -100%)
          total24hChangeUSD = total24hChangeUSD.minus(mv);
        }
      }
    }

    const currentTotal = totalPortfolioValueUSD > 0 ? new BigNumber(totalPortfolioValueUSD) : new BigNumber(0);
    const baseTotal24hAgo = currentTotal.minus(total24hChangeUSD);

    let percent = 0;
    if (baseTotal24hAgo.isGreaterThan(0)) {
      percent = total24hChangeUSD
        .dividedBy(baseTotal24hAgo)
        .multipliedBy(100)
        .toNumber();
    }

    return {
      amountUSD: total24hChangeUSD.toNumber(),
      percent,
    };
  }

  /**
   * 逐笔交易已实现盈亏与成本回溯分析
   * 
   * 基于历史时序与加权移动平均成本法 (Moving Average Cost Basis)，
   * 为每一笔卖出计算当时准确的持仓成本均价、已实现盈亏额与收益率，
   * 为每一笔买入计算实际建仓支出与买入后摊薄均价。
   */
  public static calculateTransactionPnLList(
    transactions: Transaction[]
  ): Map<string, TransactionPnLInfo> {
    const resultMap = new Map<string, TransactionPnLInfo>();
    if (!transactions || transactions.length === 0) {
      return resultMap;
    }

    // 按资产与交易平台分组进行资金独立核算
    const groups = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = `${tx.assetId || 'default'}_${tx.platform || 'GLOBAL'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }

    for (const [, txList] of groups) {
      // 严格按时间戳升序排序 (历史 -> 当前)
      // 若时间戳相同，买入必须在卖出之前结算；若类型也相同则按创建时间排序
      const sorted = [...txList].sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        if (a.type !== b.type) {
          return a.type === 'BUY' ? -1 : 1;
        }
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

      let currentQty = new BigNumber(0);
      let avgCost = new BigNumber(0);

      for (const tx of sorted) {
        const txAmount = new BigNumber(tx.amount || 0);
        const txPrice = new BigNumber(tx.price || 0);
        const txFee = new BigNumber(tx.fee || 0);
        const totalVal = txAmount.multipliedBy(txPrice);

        if (tx.type === 'BUY') {
          const tradeCost = totalVal.plus(txFee);
          const newAvg = this.calculateWeightedAverageCost(
            currentQty,
            avgCost,
            txAmount,
            txPrice
          );
          avgCost = new BigNumber(newAvg);
          currentQty = currentQty.plus(txAmount);

          resultMap.set(tx.id, {
            transactionId: tx.id,
            type: 'BUY',
            amount: txAmount.toNumber(),
            price: txPrice.toNumber(),
            fee: txFee.toNumber(),
            totalValueUSD: totalVal.toNumber(),
            buyCostUSD: tradeCost.toNumber(),
            holdingAvgCostAfterBuy: avgCost.toNumber(),
          });
        } else if (tx.type === 'SELL') {
          // 卖出流水防超卖截断保护
          let validSellAmount = txAmount;
          let isOversell = false;
          if (txAmount.isGreaterThan(currentQty)) {
            validSellAmount = currentQty;
            isOversell = true;
          }

          const costBasisAtSale = avgCost.toNumber();
          let realizedPnL = 0;
          let realizedPnLPercent = 0;

          if (validSellAmount.isGreaterThan(0) && avgCost.isGreaterThan(0)) {
            const grossProfit = txPrice.minus(avgCost).multipliedBy(validSellAmount);
            realizedPnL = grossProfit.minus(txFee).toNumber();
            realizedPnLPercent = txPrice
              .minus(avgCost)
              .dividedBy(avgCost)
              .multipliedBy(100)
              .toNumber();
          } else if (validSellAmount.isGreaterThan(0) && avgCost.isZero()) {
            realizedPnL = txPrice.multipliedBy(validSellAmount).minus(txFee).toNumber();
            realizedPnLPercent = 100;
          }

          resultMap.set(tx.id, {
            transactionId: tx.id,
            type: 'SELL',
            amount: txAmount.toNumber(),
            price: txPrice.toNumber(),
            fee: txFee.toNumber(),
            totalValueUSD: totalVal.toNumber(),
            costBasisAtSale,
            realizedPnL,
            realizedPnLPercent,
            validAmount: validSellAmount.toNumber(),
            isOversell,
          });

          currentQty = currentQty.minus(validSellAmount);
          if (currentQty.isZero()) {
            avgCost = new BigNumber(0);
          }
        }
      }
    }

    return resultMap;
  }
}
