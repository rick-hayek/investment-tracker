import { IExchangeAdapter, TickerData, HistoricalPoint } from './types';

export class CoinbaseAdapter implements IExchangeAdapter {
  readonly platformName = 'Coinbase';
  private readonly baseUrl = 'https://api.exchange.coinbase.com';

  formatSymbol(inputSymbol: string): string {
    const raw = inputSymbol.trim().toUpperCase();
    if (!raw) return 'BTC-USD';

    if (raw.includes('-')) {
      return raw;
    }

    for (const quote of ['USDT', 'USDC', 'USD', 'EUR']) {
      if (raw.endsWith(quote) && raw.length > quote.length) {
        const base = raw.slice(0, raw.length - quote.length);
        return `${base}-${quote}`;
      }
    }

    // 默认对 USD
    return `${raw}-USD`;
  }

  getFormatHint(): string {
    return '💡 建议格式：Coinbase 填 BTC-USD 或 BTC';
  }

  async fetchTicker(symbol: string): Promise<TickerData> {
    const formatted = this.formatSymbol(symbol);
    const statsUrl = `${this.baseUrl}/products/${formatted}/stats`;

    const response = await fetch(statsUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'InvestmentTrackerApp/1.0',
      },
    });

    if (!response.ok) {
      // 尝试降级查基础 ticker
      const tickerUrl = `${this.baseUrl}/products/${formatted}/ticker`;
      const tickerResp = await fetch(tickerUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'InvestmentTrackerApp/1.0',
        },
      });
      if (!tickerResp.ok) {
        throw new Error(`Coinbase API error: ${response.status} ${response.statusText}`);
      }
      const tickerData = await tickerResp.json();
      const price = parseFloat(tickerData.price);
      return {
        symbol: formatted,
        priceUSD: isNaN(price) ? 0 : price,
        change24hPercent: 0,
        lastUpdated: tickerData.time ? new Date(tickerData.time).getTime() : Date.now(),
        isFallback: false,
      };
    }

    const stats = await response.json();
    const priceUSD = parseFloat(stats.last);
    const open = stats.open ? parseFloat(stats.open) : null;
    let change24hPercent = 0;
    if (open && open > 0 && !isNaN(priceUSD)) {
      change24hPercent = ((priceUSD - open) / open) * 100;
    }

    const high24h = stats.high ? parseFloat(stats.high) : undefined;
    const low24h = stats.low ? parseFloat(stats.low) : undefined;

    return {
      symbol: formatted,
      priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
      change24hPercent: parseFloat(change24hPercent.toFixed(2)),
      high24h,
      low24h,
      lastUpdated: Date.now(),
      isFallback: false,
    };
  }

  async fetchHistoricalChart(
    symbol: string,
    timeframe: '24H' | '1W' | '1M' | '1Y' | 'ALL'
  ): Promise<HistoricalPoint[]> {
    const formatted = this.formatSymbol(symbol);
    let granularity = 3600; // seconds

    switch (timeframe) {
      case '24H':
        granularity = 3600; // 1h
        break;
      case '1W':
        granularity = 21600; // 6h
        break;
      case '1M':
        granularity = 86400; // 1d
        break;
      case '1Y':
        granularity = 86400 * 7;
        break;
      case 'ALL':
        granularity = 86400 * 30;
        break;
    }

    const url = `${this.baseUrl}/products/${formatted}/candles?granularity=${granularity}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'InvestmentTrackerApp/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Coinbase candles error: ${response.status}`);
    }

    const rawList = await response.json();
    // Coinbase candles 返回: [time, low, high, open, close, volume] 倒序
    const list: HistoricalPoint[] = rawList.map((row: any[]) => ({
      timestamp: row[0] * 1000,
      price: parseFloat(row[4]), // close
    }));

    return list.reverse();
  }
}
