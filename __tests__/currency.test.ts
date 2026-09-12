import {
  convertCurrency,
  formatCurrencyValue,
  getCurrencySymbol,
  getNextCurrency,
  CURRENCY_CONFIGS,
} from '../src/domain/currency';

describe('Currency Domain (多法币折算与格式化测试)', () => {
  it('正确获取法币符号与配置', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('CNY')).toBe('¥');
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('正确执行汇率折算 (USD -> CNY / EUR)', () => {
    const usdAmount = 1000;
    const cnyAmount = convertCurrency(usdAmount, 'CNY');
    const eurAmount = convertCurrency(usdAmount, 'EUR');

    expect(cnyAmount).toBe(1000 * CURRENCY_CONFIGS.CNY.rateToUSD);
    expect(eurAmount).toBe(1000 * CURRENCY_CONFIGS.EUR.rateToUSD);
  });

  it('按格式化规则展示货币金额', () => {
    expect(formatCurrencyValue(12345.67, 'USD')).toBe('$12,345.67');
    expect(formatCurrencyValue(1000, 'CNY')).toBe('¥7,150.00');
    expect(formatCurrencyValue(1000, 'EUR')).toBe('€920.00');
  });

  it('支持带有正负符号展示 (showSign)', () => {
    expect(formatCurrencyValue(500, 'USD', { showSign: true })).toBe('+$500.00');
    expect(formatCurrencyValue(-250, 'USD', { showSign: true })).toBe('-$250.00');
    expect(formatCurrencyValue(0, 'USD', { showSign: true })).toBe('$0.00');
  });

  it('支持轮转切换下一个法币 (USD -> CNY -> EUR -> USD)', () => {
    expect(getNextCurrency('USD')).toBe('CNY');
    expect(getNextCurrency('CNY')).toBe('EUR');
    expect(getNextCurrency('EUR')).toBe('USD');
  });
});
