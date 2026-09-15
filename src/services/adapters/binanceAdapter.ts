import { IExchangeAdapter, TickerData, HistoricalPoint } from './types';

export class BinanceAdapter implements IExchangeAdapter {
  readonly platformName = 'Binance';

  // 多节点支持：包含币安官方公共数据节点 (国内免翻墙直连) 与常规交易节点
  private readonly candidateBaseUrls = [
    'https://data-api.binance.vision',
    'https://api.binance.com',
    'https://api3.binance.com',
    'https://api1.binance.com',
  ];

  private async fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  formatSymbol(inputSymbol: string): string {
    const clean = inputSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return 'BTCUSDT';
    
    // 如果已经包含主流计价币对后缀，则直接返回
    if (
      clean.endsWith('USDT') ||
      clean.endsWith('USDC') ||
      clean.endsWith('BUSD') ||
      clean.endsWith('FDUSD') ||
      clean.endsWith('USD')
    ) {
      return clean;
    }
    // 默认对 USDT
    return `${clean}USDT`;
  }

  getFormatHint(): string {
    return '💡 建议格式：Binance 填 BTCUSDT 或 BTC';
  }

  async fetchTicker(symbol: string): Promise<TickerData> {
    const formatted = this.formatSymbol(symbol);
    let lastError: Error | null = null;

    for (const base of this.candidateBaseUrls) {
      try {
        const url = `${base}/api/v3/ticker/24hr?symbol=${formatted}`;
        const response = await this.fetchWithTimeout(url, 3500);

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const priceUSD = parseFloat(data.lastPrice);
        const change24hPercent = parseFloat(data.priceChangePercent);
        const high24h = data.highPrice ? parseFloat(data.highPrice) : undefined;
        const low24h = data.lowPrice ? parseFloat(data.lowPrice) : undefined;

        return {
          symbol: formatted,
          priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
          change24hPercent: isNaN(change24hPercent) ? 0 : change24hPercent,
          high24h,
          low24h,
          lastUpdated: data.closeTime || Date.now(),
          isFallback: false,
        };
      } catch (err: any) {
        lastError = err;
        // 若为 400 (Bad Request - 交易对不存在)，直接抛出无需重试其他镜像
        if (err.message && err.message.includes('400')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Binance API error: all endpoints failed');
  }

  async fetchHistoricalChart(
    symbol: string,
    timeframe: '24H' | '1W' | '1M' | '1Y' | 'ALL'
  ): Promise<HistoricalPoint[]> {
    const formatted = this.formatSymbol(symbol);
    let interval = '1h';
    let limit = 24;

    switch (timeframe) {
      case '24H':
        interval = '1h';
        limit = 24;
        break;
      case '1W':
        interval = '4h';
        limit = 42; // 7 days * 6
        break;
      case '1M':
        interval = '1d';
        limit = 30;
        break;
      case '1Y':
        interval = '1w';
        limit = 52;
        break;
      case 'ALL':
        interval = '1M';
        limit = 60;
        break;
    }

    const url = `${this.baseUrl}/api/v3/klines?symbol=${formatted}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance klines error: ${response.status}`);
    }
    const rawList = await response.json();
    return rawList.map((item: any[]) => ({
      timestamp: item[0],
      price: parseFloat(item[4]), // close price
    }));
  }
}
