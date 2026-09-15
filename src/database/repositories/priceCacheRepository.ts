import { IDatabaseConnection, getDatabaseInstance } from '../db';

export interface PriceCacheItem {
  assetId: string;
  symbol: string;
  currentPrice: number;
  change24hPercent: number;
  high24h?: number;
  low24h?: number;
  sparklineJson?: string;
  updatedAt: number;
}

interface PriceCacheRow {
  asset_id: string;
  symbol: string | null;
  current_price: number;
  change_24h_percent: number;
  high_24h: number | null;
  low_24h: number | null;
  sparkline_json: string | null;
  updated_at: number;
}

export class PriceCacheRepository {
  private db: IDatabaseConnection;

  constructor(db?: IDatabaseConnection) {
    this.db = db || getDatabaseInstance();
  }

  /**
   * 保存或更新单个代币的价格缓存
   */
  public async savePrice(
    assetId: string,
    symbol: string,
    price: number,
    change24hPercent: number = 0,
    high24h?: number,
    low24h?: number,
    sparklineJson?: string
  ): Promise<void> {
    if (!assetId || price <= 0) return;

    const sql = `
      INSERT INTO price_cache (
        asset_id, symbol, current_price, change_24h_percent,
        high_24h, low_24h, sparkline_json, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asset_id) DO UPDATE SET
        symbol = COALESCE(excluded.symbol, price_cache.symbol),
        current_price = excluded.current_price,
        change_24h_percent = excluded.change_24h_percent,
        high_24h = COALESCE(excluded.high_24h, price_cache.high_24h),
        low_24h = COALESCE(excluded.low_24h, price_cache.low_24h),
        sparkline_json = COALESCE(excluded.sparkline_json, price_cache.sparkline_json),
        updated_at = excluded.updated_at;
    `;

    await this.db.run(sql, [
      assetId,
      symbol.toUpperCase().trim(),
      price,
      change24hPercent,
      high24h !== undefined ? high24h : null,
      low24h !== undefined ? low24h : null,
      sparklineJson || null,
      Date.now(),
    ]);
  }

  /**
   * 批量保存价格缓存
   */
  public async saveBatchPrices(
    items: Array<{
      assetId: string;
      symbol: string;
      price: number;
      change24hPercent: number;
      high24h?: number;
      low24h?: number;
      sparklineJson?: string;
    }>
  ): Promise<void> {
    for (const item of items) {
      if (item.price > 0) {
        await this.savePrice(
          item.assetId,
          item.symbol,
          item.price,
          item.change24hPercent,
          item.high24h,
          item.low24h,
          item.sparklineJson
        );
      }
    }
  }

  /**
   * 获取所有持久化的代币市价映射表
   * 返回格式包含 key: asset_id 和 key: symbol.toLowerCase()，以供前端即时秒开呈现
   */
  public async getAllPrices(): Promise<Record<string, { price: number; change24h: number }>> {
    const result: Record<string, { price: number; change24h: number }> = {};
    try {
      const rows = await this.db.all<PriceCacheRow>(
        `SELECT * FROM price_cache WHERE current_price > 0;`
      );

      for (const r of rows) {
        const entry = {
          price: r.current_price,
          change24h: r.change_24h_percent,
        };
        // 1. 根据 asset_id 索引
        result[r.asset_id] = entry;

        // 2. 根据 symbol 小写及大写索引
        if (r.symbol) {
          result[r.symbol.toLowerCase()] = entry;
          result[r.symbol.toUpperCase()] = entry;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch all price cache:', err);
    }
    return result;
  }

  /**
   * 按资产 ID 或代码查询单条缓存价格
   */
  public async getPrice(
    assetIdOrSymbol: string
  ): Promise<{ price: number; change24h: number } | null> {
    if (!assetIdOrSymbol) return null;
    const clean = assetIdOrSymbol.trim();
    try {
      const row = await this.db.get<PriceCacheRow>(
        `SELECT * FROM price_cache WHERE asset_id = ? OR UPPER(symbol) = UPPER(?) LIMIT 1;`,
        [clean, clean]
      );
      if (row && row.current_price > 0) {
        return {
          price: row.current_price,
          change24h: row.change_24h_percent,
        };
      }
    } catch (err) {
      console.warn(`Failed to get price cache for ${assetIdOrSymbol}:`, err);
    }
    return null;
  }

  /**
   * 清理所有持久化价格缓存
   */
  public async clear(): Promise<void> {
    await this.db.run(`DELETE FROM price_cache;`);
  }
}
