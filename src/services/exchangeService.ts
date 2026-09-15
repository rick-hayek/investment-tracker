import { PlatformType } from '../domain/types';
import {
  IExchangeAdapter,
  TickerData,
  HistoricalPoint,
  BinanceAdapter,
  OKXAdapter,
  CoinbaseAdapter,
  CoinGeckoAdapter,
  GateIOAdapter,
} from './adapters';
import { resolveCoinGeckoId } from './symbolMapper';

interface CacheItem {
  data: TickerData;
  expiresAt: number;
}

export class ExchangeService {
  private adapters: Map<string, IExchangeAdapter> = new Map();
  private cache: Map<string, CacheItem> = new Map();
  private cacheTtlMs: number;

  constructor(cacheTtlSeconds: number = 30) {
    this.cacheTtlMs = cacheTtlSeconds * 1000;
    this.registerAdapter(new BinanceAdapter());
    this.registerAdapter(new OKXAdapter());
    this.registerAdapter(new CoinbaseAdapter());
    this.registerAdapter(new CoinGeckoAdapter());
    this.registerAdapter(new GateIOAdapter());
  }

  registerAdapter(adapter: IExchangeAdapter): void {
    this.adapters.set(adapter.platformName, adapter);
  }

  getAdapter(platform: PlatformType | string): IExchangeAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No exchange adapter registered for platform: ${platform}`);
    }
    return adapter;
  }

  private getCacheKey(platform: PlatformType, symbol: string): string {
    return `${platform}:${symbol.toUpperCase().trim()}`;
  }

  getCache(platform: PlatformType, symbol: string): TickerData | null {
    const key = this.getCacheKey(platform, symbol);
    const item = this.cache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.data;
    }
    if (item) {
      this.cache.delete(key);
    }
    return null;
  }

  setCache(platform: PlatformType, symbol: string, data: TickerData): void {
    const key = this.getCacheKey(platform, symbol);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 拉取指定平台的行情价格，若失败/被网络拦截自动依次降级至多级高可用备用源
   * 降级顺序：主平台 -> Binance (含 data-api.binance.vision 免翻墙直连) -> Gate.io (国内高可用直连) -> CoinGecko
   */
  async fetchTicker(
    platform: PlatformType,
    symbol: string,
    forceRefresh = false
  ): Promise<TickerData> {
    const adapter = this.getAdapter(platform);
    const formattedSymbol = adapter.formatSymbol(symbol);

    // 检查缓存
    if (!forceRefresh) {
      const cached = this.getCache(platform, formattedSymbol);
      if (cached) {
        return cached;
      }
    }

    try {
      // 1. 优先调用选定的主平台 (如 OKX / Binance / Coinbase)
      const ticker = await adapter.fetchTicker(formattedSymbol);
      this.setCache(platform, formattedSymbol, ticker);
      return ticker;
    } catch (primaryError) {
      // 2. 失败多级容灾与国内网络备用源调度
      // 备选 1: 币安 (包含官方全球直连免翻墙公共行情接口 data-api.binance.vision)
      if (platform !== 'Binance') {
        try {
          const binanceAdapter = this.getAdapter('Binance');
          const fbTicker = await binanceAdapter.fetchTicker(symbol);
          const result: TickerData = {
            ...fbTicker,
            symbol: formattedSymbol,
            isFallback: true,
          };
          this.setCache(platform, formattedSymbol, result);
          return result;
        } catch {}
      }

      // 备选 2: Gate.io (国内访问高可用，全币种覆盖，无须鉴权)
      try {
        const gateAdapter = this.getAdapter('GateIO');
        if (gateAdapter) {
          const fbTicker = await gateAdapter.fetchTicker(symbol);
          const result: TickerData = {
            ...fbTicker,
            symbol: formattedSymbol,
            isFallback: true,
          };
          this.setCache(platform, formattedSymbol, result);
          return result;
        }
      } catch {}

      // 备选 3: CoinGecko
      if (platform !== 'CoinGecko') {
        try {
          const coinGeckoAdapter = this.getAdapter('CoinGecko');
          const fallbackId = resolveCoinGeckoId(symbol);
          const fallbackTicker = await coinGeckoAdapter.fetchTicker(fallbackId);

          const result: TickerData = {
            ...fallbackTicker,
            symbol: formattedSymbol,
            isFallback: true,
          };
          this.setCache(platform, formattedSymbol, result);
          return result;
        } catch {}
      }

      // 所有网络备用源均失败，抛出原异常
      throw primaryError;
    }
  }

  /**
   * 聚合分时历史 K 线数据，支持主平台与国内备用平台自动容灾
   */
  async fetchHistoricalChart(
    platform: PlatformType,
    symbol: string,
    timeframe: '24H' | '1W' | '1M' | '1Y' | 'ALL'
  ): Promise<HistoricalPoint[]> {
    const primaryAdapter = this.getAdapter(platform);
    if (primaryAdapter.fetchHistoricalChart) {
      try {
        const points = await primaryAdapter.fetchHistoricalChart(symbol, timeframe);
        if (points && points.length >= 2) {
          return points;
        }
      } catch {}
    }

    // 容灾 1: Binance
    if (platform !== 'Binance') {
      try {
        const binance = this.getAdapter('Binance');
        if (binance.fetchHistoricalChart) {
          const points = await binance.fetchHistoricalChart(symbol, timeframe);
          if (points && points.length >= 2) return points;
        }
      } catch {}
    }

    // 容灾 2: Gate.io (国内网络高可用)
    try {
      const gate = this.getAdapter('GateIO');
      if (gate && gate.fetchHistoricalChart) {
        const points = await gate.fetchHistoricalChart(symbol, timeframe);
        if (points && points.length >= 2) return points;
      }
    } catch {}

    // 容灾 3: CoinGecko
    if (platform !== 'CoinGecko') {
      try {
        const cg = this.getAdapter('CoinGecko');
        if (cg.fetchHistoricalChart) {
          const fallbackId = resolveCoinGeckoId(symbol);
          const points = await cg.fetchHistoricalChart(fallbackId, timeframe);
          if (points && points.length >= 2) return points;
        }
      } catch {}
    }

    return [];
  }

  /**
   * 批量查询多个代币行情
   */
  async fetchBatchTickers(
    items: Array<{ platform: PlatformType; symbol: string }>,
    forceRefresh = false
  ): Promise<Map<string, TickerData>> {
    const results = new Map<string, TickerData>();
    const promises = items.map(async ({ platform, symbol }) => {
      try {
        const ticker = await this.fetchTicker(platform, symbol, forceRefresh);
        results.set(`${platform}:${symbol}`, ticker);
      } catch (err) {
        console.warn(`Failed to fetch ticker for ${platform} ${symbol}:`, err);
      }
    });

    await Promise.all(promises);
    return results;
  }
}

// 全局单例导出
export const defaultExchangeService = new ExchangeService(30);
