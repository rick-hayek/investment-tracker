import { PlatformType } from '../domain/types';
import {
  IExchangeAdapter,
  TickerData,
  HistoricalPoint,
  BinanceAdapter,
  OKXAdapter,
  CoinbaseAdapter,
  CoinGeckoAdapter,
} from './adapters';
import { resolveCoinGeckoId } from './symbolMapper';

interface CacheItem {
  data: TickerData;
  expiresAt: number;
}

export class ExchangeService {
  private adapters: Map<PlatformType, IExchangeAdapter> = new Map();
  private cache: Map<string, CacheItem> = new Map();
  private cacheTtlMs: number;

  constructor(cacheTtlSeconds: number = 30) {
    this.cacheTtlMs = cacheTtlSeconds * 1000;
    this.registerAdapter(new BinanceAdapter());
    this.registerAdapter(new OKXAdapter());
    this.registerAdapter(new CoinbaseAdapter());
    this.registerAdapter(new CoinGeckoAdapter());
  }

  registerAdapter(adapter: IExchangeAdapter): void {
    this.adapters.set(adapter.platformName, adapter);
  }

  getAdapter(platform: PlatformType): IExchangeAdapter {
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
   * 拉取指定平台的行情价格，若失败/限流自动降级至 CoinGecko 兜底
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
      // 1. 优先调用选定的平台
      const ticker = await adapter.fetchTicker(formattedSymbol);
      this.setCache(platform, formattedSymbol, ticker);
      return ticker;
    } catch (primaryError) {
      // 2. 失败容灾：若主选平台不是 CoinGecko，降级使用 CoinGecko 兜底
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
        } catch (fallbackError) {
          // 兜底也失败，抛出原异常
          throw primaryError;
        }
      }

      throw primaryError;
    }
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
