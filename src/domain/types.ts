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

export type DepositCurrency = 'USDT' | 'USDC';
export type CapitalOperationType = 'DEPOSIT' | 'WITHDRAW';

/**
 * 交易所本金充值与提现资金流水 (Deposit / Withdrawal)
 */
export interface Deposit {
  id: string; // UUID
  type?: CapitalOperationType; // 'DEPOSIT' (默认) 或 'WITHDRAW'
  platform: PlatformType; // 目标交易平台
  currency: DepositCurrency; // 稳定币币种 (USDT / USDC)
  amount: number; // 金额 (> 0)
  timestamp: number; // 发生时间戳 (ms)
  notes?: string; // 备注
  createdAt: number; // 记录创建时间戳 (ms)
}

/**
 * 单个交易所的稳定币本金与可用余额
 */
export interface PlatformBalance {
  platform: PlatformType;
  usdt: number;
  usdc: number;
  totalUSD: number;
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
  fundingCurrency?: DepositCurrency; // 支付/回款稳定币本金币种 (默认 USDT)
  platform: PlatformType; // 交易平台
  timestamp: number; // 成交时间戳 (ms)
  notes?: string; // 备注说明
  createdAt: number; // 记录创建时间戳 (ms)
}

/**
 * 逐笔交易已实现盈亏与成本回溯分析结果
 */
export interface TransactionPnLInfo {
  transactionId: string;
  type: TransactionType;
  amount: number;
  price: number;
  fee: number;
  totalValueUSD: number;
  // 卖出记录专用字段 (SELL)
  costBasisAtSale?: number; // 该笔卖出发生时的加权持仓成本单价 (USD)
  realizedPnL?: number; // 该笔卖出的已实现盈亏额 (USD, 扣除手续费)
  realizedPnLPercent?: number; // 该笔卖出的盈亏百分比 (%)
  validAmount?: number; // 有效卖出数量 (防超卖截断)
  isOversell?: boolean; // 是否超卖
  // 买入记录专用字段 (BUY)
  buyCostUSD?: number; // 买入总支出额 (含手续费)
  holdingAvgCostAfterBuy?: number; // 买入发生后持仓加权成本均价 (USD)
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
  cumulativeCostBasis?: number; // 累计投入成本本金 (包含已清仓部分成本)
  totalBoughtCost?: number; // 历史累计买入总花费 (USD)
  totalSoldProceeds?: number; // 历史累计卖出总回笼 (USD)
  totalProfit?: number; // 代币全周期总利润 (realizedPnL + unrealizedPnL)
  totalProfitPercent?: number; // 代币全周期累计回报率 % (totalProfit / cumulativeCostBasis * 100)
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
  totalMarketValue: number; // 组合当前总财产市值 (USD，包含代币持仓与现金本金)
  totalCostBasis: number; // 组合当前持仓代币总成本
  totalCumulativeCostBasis?: number; // 组合全周期累计代币投入总成本 (含已清仓)
  totalUnrealizedPnL: number; // 组合总未实现盈亏金额
  totalUnrealizedPnLPercent: number; // 组合总未实现盈亏率 %
  totalRealizedPnL: number; // 历史已实现盈亏汇总
  netProfit: number; // 净总利润 (未实现 + 已实现)
  netProfitPercent: number; // 累计代币投资回报率 %
  assetHoldings: AssetHolding[]; // 各资产明细

  // 多交易所资金聚合与总财产模型
  platformBalances?: Record<PlatformType, { usdt: number; usdc: number; totalUSD: number }>;
  totalCashReservesUSD?: number; // 全平台可用稳定币现金储备 (USDT + USDC)
  totalCryptoMarketValueUSD?: number; // 全平台持仓代币市值
  totalNetDepositsUSD?: number; // 累计净充值本金总额
  totalPortfolioValueUSD?: number; // 全平台总财产 (代币市值 + 稳定币本金)
  totalNetProfitUSD?: number; // 累计全周期投资净盈亏 (总财产 - 净充值本金)
  totalNetProfitPercent?: number; // 累计全周期投资净回报率 %
}

import { LanguageType } from '../i18n/types';

export interface CloudUserInfo {
  email: string;
  name?: string;
  avatarUrl?: string;
  connectedAt?: number;
}

export type ThemeMode = 'system' | 'dark' | 'light';

/**
 * 支持的 4 个交易所平台（按英文字母升序排列：Binance, Coinbase, CoinGecko, OKX）
 */
export const ALL_PLATFORMS_ALPHABETICAL: PlatformType[] = ['Binance', 'Coinbase', 'CoinGecko', 'OKX'];

/**
 * 用户配置模型
 */
export interface UserSettings {
  baseCurrency: CurrencyType;
  privacyMode: boolean; // 是否隐藏具体金额
  biometricLock?: boolean; // 是否启用生物识别 (暂缓)
  appSwitcherBlur: boolean; // 切出多任务后台是否显示防截屏遮罩
  theme: ThemeMode;
  language: LanguageType;
  cloudUser?: CloudUserInfo | null; // 登录 Google Drive 云端同步后保存的用户信息
  enabledPlatforms?: PlatformType[]; // 用户在记账与入金弹窗中启用的交易所列表
}

