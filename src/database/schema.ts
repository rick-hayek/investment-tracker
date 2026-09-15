/**
 * SQLite Database Schema and Migration Queries
 */

export const SCHEMA_VERSION = 2;

export const CREATE_ASSETS_TABLE = `
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Binance',
    icon_url TEXT,
    created_at INTEGER NOT NULL
);
`;

export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL')),
    amount REAL NOT NULL CHECK(amount > 0),
    price REAL NOT NULL CHECK(price >= 0),
    fee REAL DEFAULT 0,
    fee_currency TEXT DEFAULT 'USD',
    funding_currency TEXT DEFAULT 'USDT',
    platform TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
`;

export const CREATE_TRANSACTIONS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_tx_asset_timestamp ON transactions(asset_id, timestamp DESC);
`;

export const CREATE_DEPOSITS_TABLE = `
CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'DEPOSIT' CHECK(type IN ('DEPOSIT', 'WITHDRAW')),
    platform TEXT NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('USDT', 'USDC')),
    amount REAL NOT NULL CHECK(amount > 0),
    timestamp INTEGER NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL
);
`;

export const CREATE_DEPOSITS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_deposits_platform ON deposits(platform, timestamp DESC);
`;

export const CREATE_PRICE_CACHE_TABLE = `
CREATE TABLE IF NOT EXISTS price_cache (
    asset_id TEXT PRIMARY KEY,
    symbol TEXT,
    current_price REAL NOT NULL,
    change_24h_percent REAL DEFAULT 0,
    high_24h REAL,
    low_24h REAL,
    sparkline_json TEXT,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
`;

export const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`;

export const ALL_MIGRATIONS = [
  CREATE_ASSETS_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_TRANSACTIONS_INDEX,
  CREATE_DEPOSITS_TABLE,
  CREATE_DEPOSITS_INDEX,
  CREATE_PRICE_CACHE_TABLE,
  CREATE_SETTINGS_TABLE,
];


