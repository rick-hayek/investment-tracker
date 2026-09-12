import {
  BinanceAdapter,
  OKXAdapter,
  CoinbaseAdapter,
  CoinGeckoAdapter,
} from '../src/services/adapters';

describe('Exchange Adapters (多平台行情适配器测试)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('BinanceAdapter', () => {
    const adapter = new BinanceAdapter();

    it('格式化代币代码 (默认加 USDT 后缀)', () => {
      expect(adapter.formatSymbol('BTC')).toBe('BTCUSDT');
      expect(adapter.formatSymbol('eth')).toBe('ETHUSDT');
      expect(adapter.formatSymbol('BTCUSDT')).toBe('BTCUSDT');
      expect(adapter.formatSymbol('SOLUSDC')).toBe('SOLUSDC');
    });

    it('提供正确的格式建议提示语', () => {
      expect(adapter.getFormatHint()).toContain('Binance 填 BTCUSDT');
    });

    it('成功解析 24hr Ticker 响应数据', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'BTCUSDT',
          lastPrice: '68420.50',
          priceChangePercent: '3.85',
          highPrice: '69500.00',
          lowPrice: '66200.00',
          closeTime: 1726000000000,
        }),
      } as any);

      const ticker = await adapter.fetchTicker('BTC');
      expect(ticker.symbol).toBe('BTCUSDT');
      expect(ticker.priceUSD).toBe(68420.5);
      expect(ticker.change24hPercent).toBe(3.85);
      expect(ticker.high24h).toBe(69500);
      expect(ticker.low24h).toBe(66200);
      expect(ticker.isFallback).toBe(false);
    });

    it('接口返回 HTTP 异常时抛出错误', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as any);

      await expect(adapter.fetchTicker('BTC')).rejects.toThrow('Binance API error: 403 Forbidden');
    });
  });

  describe('OKXAdapter', () => {
    const adapter = new OKXAdapter();

    it('格式化代币代码 (中划线分割)', () => {
      expect(adapter.formatSymbol('BTC')).toBe('BTC-USDT');
      expect(adapter.formatSymbol('BTCUSDT')).toBe('BTC-USDT');
      expect(adapter.formatSymbol('ETH-USDT')).toBe('ETH-USDT');
      expect(adapter.formatSymbol('SOLUSDC')).toBe('SOL-USDC');
    });

    it('成功解析 OKX API v5 Ticker 响应数据', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '0',
          msg: '',
          data: [
            {
              instId: 'BTC-USDT',
              last: '68500.00',
              open24h: '65000.00',
              high24h: '69000.00',
              low24h: '64500.00',
              ts: '1726000000000',
            },
          ],
        }),
      } as any);

      const ticker = await adapter.fetchTicker('BTC');
      expect(ticker.symbol).toBe('BTC-USDT');
      expect(ticker.priceUSD).toBe(68500);
      expect(ticker.change24hPercent).toBeCloseTo(5.38, 1);
      expect(ticker.high24h).toBe(69000);
    });

    it('OKX 返回业务 code != 0 时抛出错误', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '51001',
          msg: 'Instrument ID does not exist',
          data: [],
        }),
      } as any);

      await expect(adapter.fetchTicker('INVALID')).rejects.toThrow('OKX ticker not found');
    });
  });

  describe('CoinbaseAdapter', () => {
    const adapter = new CoinbaseAdapter();

    it('格式化代币代码 (对 USD)', () => {
      expect(adapter.formatSymbol('BTC')).toBe('BTC-USD');
      expect(adapter.formatSymbol('BTCUSD')).toBe('BTC-USD');
      expect(adapter.formatSymbol('ETH-USD')).toBe('ETH-USD');
    });

    it('成功解析 Coinbase stats 数据', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          open: '65000',
          high: '69000',
          low: '64000',
          last: '68250',
          volume: '12000',
        }),
      } as any);

      const ticker = await adapter.fetchTicker('BTC');
      expect(ticker.symbol).toBe('BTC-USD');
      expect(ticker.priceUSD).toBe(68250);
      expect(ticker.change24hPercent).toBe(5);
    });
  });

  describe('CoinGeckoAdapter', () => {
    const adapter = new CoinGeckoAdapter();

    it('格式化代币代码至 CoinGecko ID (如 BTC -> bitcoin)', () => {
      expect(adapter.formatSymbol('BTC')).toBe('bitcoin');
      expect(adapter.formatSymbol('ETH')).toBe('ethereum');
      expect(adapter.formatSymbol('SOL')).toBe('solana');
      expect(adapter.formatSymbol('btcusdt')).toBe('bitcoin');
      expect(adapter.formatSymbol('unknown-coin')).toBe('unknown-coin');
    });

    it('成功解析 CoinGecko simple price 响应', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bitcoin: {
            usd: 68420,
            usd_24h_change: 3.82,
          },
        }),
      } as any);

      const ticker = await adapter.fetchTicker('BTC');
      expect(ticker.symbol).toBe('bitcoin');
      expect(ticker.priceUSD).toBe(68420);
      expect(ticker.change24hPercent).toBe(3.82);
    });

    it('代币未在 CoinGecko 找到时抛出错误', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as any);

      await expect(adapter.fetchTicker('NOTEXIST')).rejects.toThrow('CoinGecko token not found');
    });

    it('解析 CoinGecko 历史价格点阵', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prices: [
            [1720000000000, 64000],
            [1720003600000, 64500],
          ],
        }),
      } as any);

      const points = await adapter.fetchHistoricalChart('bitcoin', '24H');
      expect(points.length).toBe(2);
      expect(points[0].price).toBe(64000);
    });
  });

  describe('Binance / OKX / Coinbase 历史走势获取', () => {
    it('BinanceAdapter.fetchHistoricalChart 正确转换 K 线', async () => {
      const adapter = new BinanceAdapter();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          [1720000000000, '64000', '65000', '63800', '64800', '100', 1720003600000],
        ],
      } as any);

      const points = await adapter.fetchHistoricalChart('BTC', '24H');
      expect(points.length).toBe(1);
      expect(points[0].price).toBe(64800);
    });

    it('OKXAdapter.fetchHistoricalChart 倒序转正序', async () => {
      const adapter = new OKXAdapter();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '0',
          data: [
            ['1720003600000', '64800', '65000', '64700', '64900', '10'],
            ['1720000000000', '64000', '64800', '63900', '64800', '12'],
          ],
        }),
      } as any);

      const points = await adapter.fetchHistoricalChart('BTC', '24H');
      expect(points.length).toBe(2);
      expect(points[0].timestamp).toBe(1720000000000);
      expect(points[1].timestamp).toBe(1720003600000);
    });

    it('CoinbaseAdapter.fetchHistoricalChart 正确解析 candles', async () => {
      const adapter = new CoinbaseAdapter();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          [1720003600, 64700, 65000, 64800, 64900, 10],
          [1720000000, 63900, 64800, 64000, 64800, 12],
        ],
      } as any);

      const points = await adapter.fetchHistoricalChart('BTC', '24H');
      expect(points.length).toBe(2);
      expect(points[0].timestamp).toBe(1720000000000);
      expect(points[1].price).toBe(64900);
    });
  });
});
