import { PlatformType } from '../../domain/types';

export interface TickerData {
  symbol: string;
  priceUSD: number;
  change24hPercent: number;
  high24h?: number;
  low24h?: number;
  lastUpdated: number;
  isFallback?: boolean;
}

export interface HistoricalPoint {
  timestamp: number;
  price: number;
}

export interface IExchangeAdapter {
  readonly platformName: PlatformType;

  /**
   * 格式化与规范化用户输入的代币代码（如 BTC -> BTCUSDT 或 BTC-USDT 等）
   */
  formatSymbol(inputSymbol: string): string;

  /**
   * 返回该平台的代码格式提示语
   */
  getFormatHint(): string;

  /**
   * 获取指定代币最新实时行情
   */
  fetchTicker(symbol: string): Promise<TickerData>;

  /**
   * 获取指定代币分时历史走势点阵
   */
  fetchHistoricalChart?(
    symbol: string,
    timeframe: '24H' | '1W' | '1M' | '1Y' | 'ALL'
  ): Promise<HistoricalPoint[]>;
}
