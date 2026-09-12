export type LanguageType = 'zh' | 'en';

export interface TranslationDictionary {
  common: {
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    loading: string;
    success: string;
    error: string;
    live: string;
    offline: string;
    on: string;
    off: string;
  };
  nav: {
    appTitle: string;
    home: string;
    settings: string;
    assets: string;
    add: string;
  };
  totalCard: {
    totalAssets: string;
    cumulative: string;
    daily24h: string;
    buy: string;
    sell: string;
    analytics: string;
  };
  holdings: {
    title: string;
    addLink: string;
    emptyText: string;
    pnl: string;
  };
  settings: {
    title: string;
    editProfile: string;
    preferences: string;
    baseCurrency: string;
    privacyMode: string;
    privacyModeSubtitle: string;
    appSwitcherBlur: string;
    appSwitcherBlurSubtitle: string;
    theme: string;
    themeDark: string;
    language: string;
    exchangesAndData: string;
    connectedExchanges: string;
    exportCsv: string;
    cloudBackup: string;
    forexRates: string;
    updateRates: string;
    rateUpdateSuccess: string;
    rateUpdateFailed: string;
    resetDemo: string;
    resetDemoConfirmTitle: string;
    resetDemoConfirmDesc: string;
    backupModalTitle: string;
    backupModalDesc: string;
    exportJsonBtn: string;
    importJsonBtn: string;
    importModalTitle: string;
    importModalDesc: string;
    importPlaceholder: string;
    validateAndRestore: string;
    restoreSuccess: string;
  };
  drawer: {
    portfolioHome: string;
    settingsAndProfile: string;
    baseCurrencyLabel: string;
    privacyModeLabel: string;
    biometricLockLabel: string;
    planned: string;
    version: string;
  };
  transaction: {
    recordTitle: string;
    buy: string;
    sell: string;
    selectPlatform: string;
    tokenSymbol: string;
    available: string;
    buyPrice: string;
    sellPrice: string;
    useMarketPrice: string;
    quantityAmount: string;
    notes: string;
    notesPlaceholder: string;
    confirmBuy: string;
    confirmSell: string;
    oversellError: string;
    invalidAmountError: string;
    recordTransactionBtn: string;
  };
  detail: {
    currentHoldingValue: string;
    costBasis: string;
    totalCost: string;
    marketPrice: string;
    change24h: string;
    transactionHistory: string;
    unrealized: string;
    realized: string;
    buyThisToken: string;
    sellThisToken: string;
    holdingQty: string;
  };
  privacy: {
    shieldTitle: string;
    shieldSubtitle: string;
  };
}
