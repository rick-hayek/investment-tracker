import { PlatformType } from '../domain/types';
import { SYMBOL_TO_COINGECKO_ID } from './adapters/coinGeckoAdapter';

/**
 * 常见代币元数据字典
 */
export interface AssetMetadata {
  id: string; // 如 "btc"
  symbol: string; // 如 "BTC"
  name: string; // 如 "Bitcoin"
  coingeckoId: string; // 如 "bitcoin"
  color: string;
}

export const KNOWN_ASSETS: Record<string, AssetMetadata> = {
  BTC: { id: 'btc', symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin', color: '#F7931A' },
  ETH: { id: 'eth', symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum', color: '#627EEA' },
  SOL: { id: 'sol', symbol: 'SOL', name: 'Solana', coingeckoId: 'solana', color: '#14F195' },
  BNB: { id: 'bnb', symbol: 'BNB', name: 'BNB', coingeckoId: 'binancecoin', color: '#F3BA2F' },
  DOGE: { id: 'doge', symbol: 'DOGE', name: 'Dogecoin', coingeckoId: 'dogecoin', color: '#C2A633' },
  XRP: { id: 'xrp', symbol: 'XRP', name: 'XRP', coingeckoId: 'ripple', color: '#23292F' },
  ADA: { id: 'ada', symbol: 'ADA', name: 'Cardano', coingeckoId: 'cardano', color: '#0033AD' },
  AVAX: { id: 'avax', symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2', color: '#E84142' },
  SUI: { id: 'sui', symbol: 'SUI', name: 'Sui', coingeckoId: 'sui', color: '#4DA2FF' },
  PEPE: { id: 'pepe', symbol: 'PEPE', name: 'Pepe', coingeckoId: 'pepe', color: '#548842' },
};

/**
 * 将任意输入字符串提取为基础代币代码 (Base Symbol)，如 "BTCUSDT" -> "BTC", "BTC-USD" -> "BTC"
 */
export function extractBaseSymbol(input: string): string {
  let clean = input.trim().toUpperCase();
  if (clean.includes('-')) {
    return clean.split('-')[0];
  }
  for (const quote of ['USDT', 'USDC', 'BUSD', 'FDUSD', 'USD', 'EUR']) {
    if (clean.endsWith(quote) && clean.length > quote.length) {
      return clean.slice(0, clean.length - quote.length);
    }
  }
  return clean;
}

/**
 * 根据平台与代币代码，推断 CoinGecko 的 ID 用于兜底降级
 */
export function resolveCoinGeckoId(symbol: string): string {
  const base = extractBaseSymbol(symbol);
  if (KNOWN_ASSETS[base]) {
    return KNOWN_ASSETS[base].coingeckoId;
  }
  if (SYMBOL_TO_COINGECKO_ID[base]) {
    return SYMBOL_TO_COINGECKO_ID[base];
  }
  return base.toLowerCase();
}
