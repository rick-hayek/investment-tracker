import { IExchangeAdapter, TickerData, HistoricalPoint } from './types';

export class GateIOAdapter implements IExchangeAdapter {
  readonly platformName = 'GateIO';

  private readonly primaryBaseUrl = 'https://api.gateio.ws';
  private readonly backupBaseUrl = 'https://data.gateapi.io';

  /**
   * 将代币代码格式化为 Gate.io 现货交易对格式 (如 BTC_USDT)
   */
  formatSymbol(inputSymbol: string): string {
    const raw = inputSymbol.trim().toUpperCase();
    if (!raw) return 'BTC_USDT';

    if (raw.includes('_')) {
      return raw;
    }

    if (raw.includes('-')) {
      return raw.replace('-', '_');
    }

    // 检查常见计价币后缀
    for (const quote of ['USDT', 'USDC', 'USD', 'BTC', 'ETH']) {
      if (raw.endsWith(quote) && raw.length > quote.length) {
        const base = raw.slice(0, raw.length - quote.length);
        return `${base}_${quote}`;
      }
    }

    return `${raw}_USDT`;
  }

  getFormatHint(): string {
    return '💡 建议格式：Gate.io 填 BTC_USDT 或 BTC';
  }

  private async fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
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

  /**
   * 查询 24 小时行情价格
   */
  async fetchTicker(symbol: string): Promise<TickerData> {
    const formatted = this.formatSymbol(symbol);

    // 1. 优先尝试官方 v4 接口
    try {
      const v4Url = `${this.primaryBaseUrl}/api/v4/spot/tickers?currency_pair=${formatted}`;
      const response = await this.fetchWithTimeout(v4Url, 3500);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const priceUSD = parseFloat(item.last);
          const change24hPercent = parseFloat(item.change_percentage || '0');
          const high24h = item.high_24h ? parseFloat(item.high_24h) : undefined;
          const low24h = item.low_24h ? parseFloat(item.low_24h) : undefined;

          return {
            symbol: formatted,
            priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
            change24hPercent: isNaN(change24hPercent) ? 0 : change24hPercent,
            high24h,
            low24h,
            lastUpdated: Date.now(),
            isFallback: false,
          };
        }
      }
    } catch {
      // 降级尝试备用节点
    }

    // 2. 降级尝试国内高可用公开数据镜像节点 (data.gateapi.io)
    const lowerPair = formatted.toLowerCase();
    const backupUrl = `${this.backupBaseUrl}/api2/1/ticker/${lowerPair}`;
    const backupRes = await this.fetchWithTimeout(backupUrl, 4000);

    if (!backupRes.ok) {
      throw new Error(`Gate.io API error: ${backupRes.status} ${backupRes.statusText}`);
    }

    const backupData = await backupRes.json();
    if (backupData.result === 'false' || !backupData.last) {
      throw new Error(`Gate.io ticker not found for ${formatted}`);
    }

    const priceUSD = parseFloat(backupData.last);
    const change24hPercent = parseFloat(backupData.percentChange || '0');
    const high24h = backupData.high24hr ? parseFloat(backupData.high24hr) : undefined;
    const low24h = backupData.low24hr ? parseFloat(backupData.low24hr) : undefined;

    return {
      symbol: formatted,
      priceUSD: isNaN(priceUSD) ? 0 : priceUSD,
      change24hPercent: isNaN(change24hPercent) ? 0 : change24hPercent,
      high24h,
      low24h,
      lastUpdated: Date.now(),
      isFallback: false,
    };
  }

  /**
   * 查询历史 K 线折线图数据
   */
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
        limit = 42;
        break;
      case '1M':
        interval = '1d';
        limit = 30;
        break;
      case '1Y':
        interval = '7d';
        limit = 52;
        break;
      case 'ALL':
        interval = '30d';
        limit = 60;
        break;
    }

    const url = `${this.primaryBaseUrl}/api/v4/spot/candlesticks?currency_pair=${formatted}&interval=${interval}&limit=${limit}`;
    const response = await this.fetchWithTimeout(url, 5000);

    if (!response.ok) {
      throw new Error(`Gate.io candlesticks error: ${response.status}`);
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((item: any[]) => ({
      timestamp: parseInt(item[0], 10) * 1000,
      price: parseFloat(item[2]), // close price
    }));
  }
}
