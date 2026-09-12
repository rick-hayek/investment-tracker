import { IExchangeAdapter, TickerData, HistoricalPoint } from './types';

export class OKXAdapter implements IExchangeAdapter {
  readonly platformName = 'OKX';
  private readonly baseUrl = 'https://www.okx.com';

  formatSymbol(inputSymbol: string): string {
    const raw = inputSymbol.trim().toUpperCase();
    if (!raw) return 'BTC-USDT';

    if (raw.includes('-')) {
      return raw;
    }

    // 处理无连字符的情况 (如 BTCUSDT, BTCUSDC)
    for (const quote of ['USDT', 'USDC', 'USD']) {
      if (raw.endsWith(quote) && raw.length > quote.length) {
        const base = raw.slice(0, raw.length - quote.length);
        return `${base}-${quote}`;
      }
    }

    // 默认对 USDT
    return `${raw}-USDT`;
  }

  getFormatHint(): string {
    return '💡 建议格式：OKX 填 BTC-USDT 或 BTC';
  }

  async fetchTicker(symbol: string): Promise<TickerData> {
    const formatted = this.formatSymbol(symbol);
    const url = `${this.baseUrl}/api/v5/market/ticker?instId=${formatted}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.code !== '0' || !json.data || json.data.length === 0) {
      throw new Error(`OKX ticker not found: ${json.msg || 'No data'}`);
    }

    const item = json.data[0];
    const priceUSD = parseFloat(item.last);
    const open24h = item.open24h ? parseFloat(item.open24h) : null;
    let change24hPercent = 0;
    if (open24h && open24h > 0) {
      change24hPercent = ((priceUSD - open24h) / open24h) * 100;
    }

    const high24h = item.high24h ? parseFloat(item.high24h) : undefined;
    const low24h = item.low24h ? parseFloat(item.low24h) : undefined;
    const lastUpdated = item.ts ? parseInt(item.ts, 10) : Date.now();

    return {
      symbol: formatted,
      priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
      change24hPercent: parseFloat(change24hPercent.toFixed(2)),
      high24h,
      low24h,
      lastUpdated,
      isFallback: false,
    };
  }

  async fetchHistoricalChart(
    symbol: string,
    timeframe: '24H' | '1W' | '1M' | '1Y' | 'ALL'
  ): Promise<HistoricalPoint[]> {
    const formatted = this.formatSymbol(symbol);
    let bar = '1H';
    let limit = '24';

    switch (timeframe) {
      case '24H':
        bar = '1H';
        limit = '24';
        break;
      case '1W':
        bar = '4H';
        limit = '42';
        break;
      case '1M':
        bar = '1D';
        limit = '30';
        break;
      case '1Y':
        bar = '1W';
        limit = '52';
        break;
      case 'ALL':
        bar = '1M';
        limit = '60';
        break;
    }

    const url = `${this.baseUrl}/api/v5/market/candles?instId=${formatted}&bar=${bar}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OKX candles error: ${response.status}`);
    }
    const json = await response.json();
    if (json.code !== '0' || !json.data) {
      return [];
    }

    // OKX 返回按时间倒序排列的数据: [ts, o, h, l, c, vol, volCcy]
    const list: HistoricalPoint[] = json.data.map((row: any[]) => ({
      timestamp: parseInt(row[0], 10),
      price: parseFloat(row[4]), // c: close price
    }));

    return list.reverse(); // 转换为正序 (从早到晚)
  }
}
