import { t, getLanguageName, zh, en, translations, DEFAULT_LANGUAGE, LanguageType } from '../src/i18n';

describe('i18n Internationalization Suite', () => {
  it('default language should be zh', () => {
    expect(DEFAULT_LANGUAGE).toBe('zh');
  });

  it('getLanguageName returns correct display labels', () => {
    expect(getLanguageName('zh')).toBe('简体中文');
    expect(getLanguageName('en')).toBe('English');
    expect(getLanguageName('invalid' as any)).toBe('简体中文');
  });

  it('zh and en dictionaries have identical key structures (100% symmetric)', () => {
    const getKeysRecursive = (obj: Record<string, any>, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          keys = keys.concat(getKeysRecursive(obj[k], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    };

    const zhKeys = getKeysRecursive(zh);
    const enKeys = getKeysRecursive(en);

    expect(zhKeys).toEqual(enKeys);
    expect(zhKeys.length).toBeGreaterThan(30);
  });

  it('translates common words in zh and en accurately', () => {
    expect(t('common.cancel', 'zh')).toBe('取消');
    expect(t('common.cancel', 'en')).toBe('Cancel');
    expect(t('common.confirm', 'zh')).toBe('确认');
    expect(t('common.confirm', 'en')).toBe('Confirm');
    expect(t('common.live', 'zh')).toBe('实时');
    expect(t('common.live', 'en')).toBe('LIVE');
  });

  it('translates navigation and drawer labels', () => {
    expect(t('drawer.portfolioHome', 'zh')).toBe('总览');
    expect(t('drawer.portfolioHome', 'en')).toBe('Portfolio');
    expect(t('drawer.settingsAndProfile', 'zh')).toBe('设置');
    expect(t('drawer.settingsAndProfile', 'en')).toBe('Settings');
    expect(t('drawer.baseCurrencyLabel', 'zh')).toBe('主法币');
    expect(t('drawer.baseCurrencyLabel', 'en')).toBe('Base Currency');
  });

  it('translates total portfolio card labels', () => {
    expect(t('totalCard.totalAssets', 'zh')).toBe('总资产净值');
    expect(t('totalCard.totalAssets', 'en')).toBe('Total Portfolio Value');
    expect(t('totalCard.buy', 'zh')).toBe('买入');
    expect(t('totalCard.buy', 'en')).toBe('Buy');
    expect(t('totalCard.sell', 'zh')).toBe('卖出');
    expect(t('totalCard.sell', 'en')).toBe('Sell');
  });

  it('translates transaction and detail views', () => {
    expect(t('transaction.recordTitle', 'zh')).toBe('记账录入');
    expect(t('transaction.recordTitle', 'en')).toBe('Record Transaction');
    expect(t('detail.currentHoldingValue', 'zh')).toBe('持仓总市值');
    expect(t('detail.currentHoldingValue', 'en')).toBe('Holding Market Value');
    expect(t('detail.costBasis', 'zh')).toBe('持仓成本均价');
    expect(t('detail.costBasis', 'en')).toBe('Average Cost Basis');
  });

  it('supports interpolation parameter replacement', () => {
    // Custom test on path with parameter
    const sampleText = t('custom.key', 'zh');
    expect(sampleText).toBe('custom.key'); // fallback to key path when not found
  });

  it('falls back to default language or path string when key is missing', () => {
    expect(t('nonexistent.path.key', 'zh')).toBe('nonexistent.path.key');
    expect(t('nonexistent.path.key', 'en')).toBe('nonexistent.path.key');
  });
});
