import { IDatabaseConnection } from '../db';

/**
 * 纯 JS 内存表适配器，用于没有原生 C++ SQLite 绑定的运行环境 (如 Expo Web / 客户端降级预览)
 */
export class MemorySqliteAdapter implements IDatabaseConnection {
  private assetsTable = new Map<string, any>();
  private transactionsTable = new Map<string, any>();
  private priceCacheTable = new Map<string, any>();

  public exec(sql: string): void {
    // 忽略 DDL 语句
  }

  public run(
    sql: string,
    params: any[] = []
  ): { changes: number; lastInsertRowId?: number } {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('INSERT INTO ASSETS')) {
      const [id, symbol, name, platform, icon_url, created_at] = params;
      this.assetsTable.set(id, { id, symbol, name, platform, icon_url, created_at });
      return { changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO TRANSACTIONS')) {
      const [id, asset_id, type, amount, price, fee, fee_currency, platform, timestamp, notes, created_at] = params;
      this.transactionsTable.set(id, {
        id,
        asset_id,
        type,
        amount,
        price,
        fee,
        fee_currency,
        platform,
        timestamp,
        notes,
        created_at,
      });
      return { changes: 1 };
    }

    if (trimmed.startsWith('DELETE FROM TRANSACTIONS WHERE ASSET_ID = ?')) {
      const [assetId] = params;
      let count = 0;
      for (const [id, tx] of this.transactionsTable.entries()) {
        if (tx.asset_id === assetId) {
          this.transactionsTable.delete(id);
          count++;
        }
      }
      return { changes: count };
    }

    if (trimmed.startsWith('DELETE FROM TRANSACTIONS WHERE ID = ?')) {
      const [id] = params;
      const had = this.transactionsTable.delete(id);
      return { changes: had ? 1 : 0 };
    }

    if (trimmed.startsWith('DELETE FROM ASSETS WHERE ID = ?')) {
      const [id] = params;
      const had = this.assetsTable.delete(id);
      return { changes: had ? 1 : 0 };
    }

    if (trimmed.startsWith('UPDATE ASSETS')) {
      const [symbol, name, platform, icon_url, id] = params;
      const existing = this.assetsTable.get(id);
      if (existing) {
        this.assetsTable.set(id, { ...existing, symbol, name, platform, icon_url });
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    return { changes: 0 };
  }

  public get<T>(sql: string, params: any[] = []): T | null {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.includes('FROM ASSETS WHERE ID = ?')) {
      const [id] = params;
      return (this.assetsTable.get(id) as T) || null;
    }

    if (trimmed.includes('FROM ASSETS WHERE UPPER(SYMBOL) = UPPER(?)')) {
      const [sym] = params;
      const search = String(sym).toUpperCase();
      for (const asset of this.assetsTable.values()) {
        if (String(asset.symbol).toUpperCase() === search) {
          return asset as T;
        }
      }
      return null;
    }

    if (trimmed.includes('FROM TRANSACTIONS WHERE ID = ?')) {
      const [id] = params;
      return (this.transactionsTable.get(id) as T) || null;
    }

    return null;
  }

  public all<T>(sql: string, params: any[] = []): T[] {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.includes('FROM ASSETS')) {
      return Array.from(this.assetsTable.values()) as T[];
    }

    if (trimmed.includes('FROM TRANSACTIONS WHERE ASSET_ID = ?')) {
      const [assetId] = params;
      const list: any[] = [];
      for (const tx of this.transactionsTable.values()) {
        if (tx.asset_id === assetId) {
          list.push(tx);
        }
      }
      return list.sort((a, b) => b.timestamp - a.timestamp) as T[];
    }

    if (trimmed.includes('FROM TRANSACTIONS')) {
      const list = Array.from(this.transactionsTable.values());
      return list.sort((a, b) => b.timestamp - a.timestamp) as T[];
    }

    return [];
  }
}
