import { CurrencyType } from './types';

export interface CurrencyConfig {
  code: CurrencyType;
  symbol: string;
  name: string;
  rateToUSD: number; // 1 USD = rateToUSD Currency (例如 1 USD = 7.15 CNY)
}

export const CURRENCY_CONFIGS: Record<CurrencyType, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: '美元 (USD)',
    rateToUSD: 1.0,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: '人民币 (CNY)',
    rateToUSD: 7.15,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: '欧元 (EUR)',
    rateToUSD: 0.92,
  },
};

/**
 * 将以 USD 计价的金额按汇率折算为目标法币
 */
export function convertCurrency(amountUSD: number, targetCurrency: CurrencyType): number {
  const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.USD;
  return amountUSD * config.rateToUSD;
}

/**
 * 获取法币对应符号
 */
export function getCurrencySymbol(currency: CurrencyType): string {
  return CURRENCY_CONFIGS[currency]?.symbol || '$';
}

/**
 * 轮询切换下一个法币 (USD -> CNY -> EUR -> USD)
 */
export function getNextCurrency(current: CurrencyType): CurrencyType {
  const order: CurrencyType[] = ['USD', 'CNY', 'EUR'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

/**
 * 格式化法币金额展示字符串
 */
export function formatCurrencyValue(
  amountUSD: number,
  currency: CurrencyType = 'USD',
  options: {
    decimals?: number;
    showSign?: boolean;
    includeSymbol?: boolean;
  } = {}
): string {
  const { decimals = 2, showSign = false, includeSymbol = true } = options;
  const converted = convertCurrency(amountUSD, currency);
  const symbol = includeSymbol ? getCurrencySymbol(currency) : '';

  const isPositive = converted > 0;
  const isNegative = converted < 0;
  const absValue = Math.abs(converted);

  const formattedNum = absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (showSign) {
    if (isPositive) {
      return `+${symbol}${formattedNum}`;
    }
    if (isNegative) {
      return `-${symbol}${formattedNum}`;
    }
  }

  return `${symbol}${formattedNum}`;
}
