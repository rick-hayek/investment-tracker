import { CurrencyType } from '../domain/types';
import { CURRENCY_CONFIGS, updateCurrencyRate } from '../domain/currency';

export interface ForexRateInfo {
  base: 'USD';
  rates: Record<CurrencyType, number>;
  lastUpdated: number; // timestamp in ms
  source: string;
}

export class ForexService {
  private lastUpdated: number = Date.now();
  private source: string = 'Local Default';
  private fetchTimeoutMs: number = 5000;

  constructor(timeoutMs = 5000) {
    this.fetchTimeoutMs = timeoutMs;
  }

  /**
   * 获取当前有效汇率状态
   */
  public getRateInfo(): ForexRateInfo {
    return {
      base: 'USD',
      rates: {
        USD: CURRENCY_CONFIGS.USD.rateToUSD,
        CNY: CURRENCY_CONFIGS.CNY.rateToUSD,
        EUR: CURRENCY_CONFIGS.EUR.rateToUSD,
      },
      lastUpdated: this.lastUpdated,
      source: this.source,
    };
  }

  /**
   * 从公共外汇 API 拉取最新法币对 USD 汇率，失败时平滑降级
   */
  public async fetchLatestRates(): Promise<ForexRateInfo> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    try {
      // 优先请求 open.er-api.com (免费免鉴权公共接口)
      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.rates) {
          const cnyRate = Number(data.rates.CNY);
          const eurRate = Number(data.rates.EUR);

          if (cnyRate > 0) {
            updateCurrencyRate('CNY', cnyRate);
          }
          if (eurRate > 0) {
            updateCurrencyRate('EUR', eurRate);
          }

          this.lastUpdated = Date.now();
          this.source = 'open.er-api.com';
          return this.getRateInfo();
        }
      }
    } catch (err) {
      console.warn('ForexService API fetch failed, falling back to cached rates:', err);
    } finally {
      clearTimeout(timeoutId);
    }

    return this.getRateInfo();
  }
}

export const defaultForexService = new ForexService();
