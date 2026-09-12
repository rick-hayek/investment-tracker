import { IExchangeAdapter, TickerData, HistoricalPoint } from './types';

// 常用代码与 CoinGecko ID 映射表
export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  POL: 'polygon-ecosystem-token',
  LTC: 'litecoin',
  UNI: 'uniswap',
  NEAR: 'near',
  SUI: 'sui',
  APT: 'aptos',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  USDT: 'tether',
  USDC: 'usd-coin',
};

export class CoinGeckoAdapter implements IExchangeAdapter {
  readonly platformName = 'CoinGecko';
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  formatSymbol(inputSymbol: string): string {
    const clean = inputSymbol.trim().toLowerCase();
    if (!clean) return 'bitcoin';

    // 移除主流交易对后缀 (如 btcusdt -> btc)
    let base = clean;
    for (const suffix of ['-usdt', 'usdt', '-usd', 'usd', '-usdc', 'usdc']) {
      if (base.endsWith(suffix) && base.length > suffix.length) {
        base = base.slice(0, base.length - suffix.length);
        break;
      }
    }

    const upperBase = base.toUpperCase();
    if (SYMBOL_TO_COINGECKO_ID[upperBase]) {
      return SYMBOL_TO_COINGECKO_ID[upperBase];
    }

    return base;
  }

  getFormatHint(): string {
    return '💡 建议格式：CoinGecko 填 bitcoin 或代币小写全称';
  }

  async fetchTicker(symbol: string): Promise<TickerData> {
    const id = this.formatSymbol(symbol);
    const url = `${this.baseUrl}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const tokenData = data[id];

    if (!tokenData || tokenData.usd === undefined) {
      throw new Error(`CoinGecko token not found: ${id}`);
    }

    const priceUSD = typeof tokenData.usd === 'number' ? tokenData.usd : 0;
    const change24hPercent = typeof tokenData.usd_24h_change === 'number' ? parseFloat(tokenData.usd_24h_change.toFixed(2)) : 0;

    return {
      symbol: id,
      priceUSD,
      change24hPercent,
      lastUpdated: Date.now(),
      isFallback: false,
    };
  }

  async fetchHistoricalChart(
    symbol: string,
    timeframe: '24H' | '1W' | '1M' | '1Y' | 'ALL'
  ): Promise<HistoricalPoint[]> {
    const id = this.formatSymbol(symbol);
    let days = '1';

    switch (timeframe) {
      case '24H':
        days = '1';
        break;
      case '1W':
        days = '7';
        break;
      case '1M':
        days = '30';
        break;
      case '1Y':
        days = '365';
        break;
      case 'ALL':
        days = 'max';
        break;
    }

    const url = `${this.baseUrl}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko market_chart error: ${response.status}`);
    }

    const json = await response.json();
    if (!json.prices || !Array.isArray(json.prices)) {
      return [];
    }

    return json.prices.map((item: [number, number]) => ({
      timestamp: item[0],
      price: item[1],
    }));
  }
}
