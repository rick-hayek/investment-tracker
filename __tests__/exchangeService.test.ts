import { ExchangeService } from '../src/services/exchangeService';
import { IExchangeAdapter, TickerData } from '../src/services/adapters/types';

describe('ExchangeService (调度与容灾降级服务测试)', () => {
  let service: ExchangeService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new ExchangeService(30); // 30s TTL
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('正常请求主平台并写入内存缓存 (防抖节流)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        symbol: 'BTCUSDT',
        lastPrice: '65000',
        priceChangePercent: '2.5',
        closeTime: 1720000000000,
      }),
    });
    global.fetch = fetchMock;

    // 第一次请求
    const res1 = await service.fetchTicker('Binance', 'BTC');
    expect(res1.priceUSD).toBe(65000);
    expect(res1.isFallback).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 第二次请求 (应命中缓存，不发起新网络请求)
    const res2 = await service.fetchTicker('Binance', 'BTC');
    expect(res2.priceUSD).toBe(65000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 强制刷新 (forceRefresh = true)
    await service.fetchTicker('Binance', 'BTC', true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('主平台网络错误或限流时，自动降级至 CoinGecko 兜底', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      // 模拟 Binance 接口 429 限流报错
      if (url.includes('binance.com')) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });
      }
      // 模拟 CoinGecko 备用接口正常返回
      if (url.includes('coingecko.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            bitcoin: {
              usd: 64900,
              usd_24h_change: 2.1,
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await service.fetchTicker('Binance', 'BTC');
    expect(result.isFallback).toBe(true);
    expect(result.priceUSD).toBe(64900);
    expect(result.symbol).toBe('BTCUSDT');
  });

  it('当主平台与 CoinGecko 兜底均失败时，抛出原主异常', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
    });

    await expect(service.fetchTicker('OKX', 'BTC')).rejects.toThrow('OKX API error: 500');
  });

  it('支持批量并发拉取多个标的行情 (fetchBatchTickers)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('binance.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            symbol: 'BTCUSDT',
            lastPrice: '68000',
            priceChangePercent: '3.0',
          }),
        });
      }
      if (url.includes('okx.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            code: '0',
            data: [{ last: '3500', open24h: '3400' }],
          }),
        });
      }
      return Promise.reject(new Error('Unknown'));
    });

    const batch = await service.fetchBatchTickers([
      { platform: 'Binance', symbol: 'BTC' },
      { platform: 'OKX', symbol: 'ETH' },
    ]);

    expect(batch.size).toBe(2);
    expect(batch.get('Binance:BTC')?.priceUSD).toBe(68000);
    expect(batch.get('OKX:ETH')?.priceUSD).toBe(3500);
  });
});
