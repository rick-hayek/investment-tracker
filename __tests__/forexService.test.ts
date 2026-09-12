import { ForexService } from '../src/services/forexService';
import { CURRENCY_CONFIGS } from '../src/domain/currency';

describe('ForexService (法币实时汇率引擎测试)', () => {
  let forexService: ForexService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    forexService = new ForexService(1000);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('获取当前初始汇率状态', () => {
    const info = forexService.getRateInfo();
    expect(info.base).toBe('USD');
    expect(info.rates.USD).toBe(1.0);
    expect(info.rates.CNY).toBeGreaterThan(0);
    expect(info.rates.EUR).toBeGreaterThan(0);
  });

  it('成功从公共外汇 API 拉取并更新最新汇率', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        rates: {
          CNY: 7.2345,
          EUR: 0.9312,
        },
      }),
    });

    const result = await forexService.fetchLatestRates();
    expect(result.rates.CNY).toBe(7.2345);
    expect(result.rates.EUR).toBe(0.9312);
    expect(CURRENCY_CONFIGS.CNY.rateToUSD).toBe(7.2345);
    expect(CURRENCY_CONFIGS.EUR.rateToUSD).toBe(0.9312);
    expect(result.source).toBe('open.er-api.com');
  });

  it('网络异常或超时时平滑降级，不抛出异常并保留缓存汇率', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await forexService.fetchLatestRates();
    expect(result.rates.USD).toBe(1.0);
    expect(result.rates.CNY).toBeGreaterThan(0);
    expect(result.rates.EUR).toBeGreaterThan(0);
  });
});
