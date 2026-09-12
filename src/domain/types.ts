/**
 * Investment Tracker - Core Domain Types
 */

export type PlatformType = 'OKX' | 'Binance' | 'CoinGecko' | 'Coinbase';

export type TransactionType = 'BUY' | 'SELL';

export type CurrencyType = 'USD' | 'CNY' | 'EUR';

/**
 * 代表一个受监控的投资资产 (如 BTC, ETH, SOL)
 */
export interface Asset {
  id: string; // 唯一标识符，如 "btc", "eth"
  symbol: string; // 标准代码，如 "BTC"
  name: string; // 名称全称，如 "Bitcoin"
  platform: PlatformType; // 默认/主要关联平台
  iconUrl?: string; // 图标路径或 URL
  createdAt: number; // 创建时间戳 (ms)
}

/**
 * 每一笔具体的买入或卖出交易记录
 */
export interface Transaction {
  id: string; // UUID
  assetId: string; // 关联 Asset.id
  type: TransactionType; // BUY 或 SELL
  amount: number; // 数量 (> 0)
  price: number; // 成交单价 (以 USD 计价，>= 0)
  fee?: number; // 手续费 (>= 0)
  feeCurrency?: string; // 手续费币种
  platform: PlatformType; // 交易平台
  timestamp: number; // 成交时间戳 (ms)
  notes?: string; // 备注说明
  createdAt: number; // 记录创建时间戳 (ms)
}

/**
 * 最新行情价格缓存
 */
export interface PriceCache {
  assetId: string;
  currentPrice: number;
  change24hPercent: number;
  high24h?: number;
  low24h?: number;
  updatedAt: number;
}

/**
 * 单个代币持仓汇总 (经财务引擎从所有历史流水计算得出)
 */
export interface AssetHolding {
  assetId: string;
  symbol: string;
  name: string;
  platform?: PlatformType; // 对应交易平台 (如 Binance, OKX)
  totalQuantity: number; // 当前持有总量
  averageCost: number; // 加权平均成本单价 (USD)
  totalCostBasis: number; // 当前持仓总成本 (averageCost * totalQuantity)
  currentPrice: number; // 实时单价 (USD)
  marketValue: number; // 当前总财产值 (currentPrice * totalQuantity)
  unrealizedPnL: number; // 未实现盈亏金额 (marketValue - totalCostBasis)
  unrealizedPnLPercent: number; // 未实现盈亏百分比
  realizedPnL: number; // 历史已实现累计结转盈亏金额
  change24hPercent: number; // 24小时涨跌幅
}

/**
 * 整个投资组合资产总看板汇总
 */
export interface PortfolioSummary {
  totalMarketValue: number; // 组合当前总财产市值 (USD)
  totalCostBasis: number; // 组合当前总成本
  totalUnrealizedPnL: number; // 组合总未实现盈亏金额
  totalUnrealizedPnLPercent: number; // 组合总未实现盈亏率 %
  totalRealizedPnL: number; // 历史已实现盈亏汇总
  netProfit: number; // 净总利润 (未实现 + 已实现)
  netProfitPercent: number; // 累计总投入回报率 %
  assetHoldings: AssetHolding[]; // 各资产明细
}

/**
 * 用户配置模型
 */
export interface UserSettings {
  baseCurrency: CurrencyType;
  privacyMode: boolean; // 是否隐藏具体金额
  biometricLock: boolean; // 是否启用生物识别
  theme: 'dark' | 'light';
}
