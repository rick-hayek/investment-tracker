import { IDatabaseConnection } from '../db';

/**
 * 纯 JS 内存表适配器，用于没有原生 C++ SQLite 绑定的运行环境 (如 Expo Web / 客户端降级预览)
 */
export class MemorySqliteAdapter implements IDatabaseConnection {
  private assetsTable = new Map<string, any>();
  private transactionsTable = new Map<string, any>();
  private priceCacheTable = new Map<string, any>();
  private settingsTable = new Map<string, any>();

  public exec(sql: string): void {
    // 忽略 DDL 语句
  }

  public run(
    sql: string,
    params: any[] = []
  ): { changes: number; lastInsertRowId?: number } {
    const normalized = sql.replace(/;$/, '').trim().toUpperCase().replace(/\s+/g, ' ');

    if (normalized.startsWith('INSERT INTO ASSETS')) {
      const [id, symbol, name, platform, icon_url, created_at] = params;
      this.assetsTable.set(id, { id, symbol, name, platform, icon_url, created_at });
      return { changes: 1 };
    }

    if (normalized.startsWith('INSERT INTO TRANSACTIONS')) {
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

    if (normalized.startsWith('INSERT INTO SETTINGS')) {
      const [key, value] = params;
      this.settingsTable.set(key, { key, value });
      return { changes: 1 };
    }

    if (normalized.startsWith('DELETE FROM TRANSACTIONS WHERE ASSET_ID = ?')) {
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

    if (normalized.startsWith('DELETE FROM TRANSACTIONS WHERE ID = ?')) {
      const [id] = params;
      const had = this.transactionsTable.delete(id);
      return { changes: had ? 1 : 0 };
    }

    if (normalized === 'DELETE FROM TRANSACTIONS' || normalized.startsWith('DELETE FROM TRANSACTIONS WHERE 1=1')) {
      const count = this.transactionsTable.size;
      this.transactionsTable.clear();
      return { changes: count };
    }

    if (normalized.startsWith('DELETE FROM ASSETS WHERE ID = ?')) {
      const [id] = params;
      const had = this.assetsTable.delete(id);
      return { changes: had ? 1 : 0 };
    }

    if (normalized === 'DELETE FROM ASSETS' || normalized.startsWith('DELETE FROM ASSETS WHERE 1=1')) {
      const count = this.assetsTable.size;
      this.assetsTable.clear();
      return { changes: count };
    }

    if (normalized.startsWith('DELETE FROM SETTINGS WHERE KEY = ?')) {
      const [key] = params;
      const had = this.settingsTable.delete(key);
      return { changes: had ? 1 : 0 };
    }

    if (normalized === 'DELETE FROM SETTINGS') {
      const count = this.settingsTable.size;
      this.settingsTable.clear();
      return { changes: count };
    }

    if (normalized.startsWith('UPDATE ASSETS')) {
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
    const normalized = sql.replace(/;$/, '').trim().toUpperCase().replace(/\s+/g, ' ');

    if (normalized.includes('FROM ASSETS WHERE ID = ?')) {
      const [id] = params;
      return (this.assetsTable.get(id) as T) || null;
    }

    if (normalized.includes('FROM ASSETS WHERE UPPER(SYMBOL) = UPPER(?)')) {
      const [sym] = params;
      const search = String(sym).toUpperCase();
      for (const asset of this.assetsTable.values()) {
        if (String(asset.symbol).toUpperCase() === search) {
          return asset as T;
        }
      }
      return null;
    }

    if (normalized.includes('FROM TRANSACTIONS WHERE ID = ?')) {
      const [id] = params;
      return (this.transactionsTable.get(id) as T) || null;
    }

    if (normalized.includes('FROM SETTINGS WHERE KEY = ?')) {
      const [key] = params;
      return (this.settingsTable.get(key) as T) || null;
    }

    return null;
  }

  public all<T>(sql: string, params: any[] = []): T[] {
    const normalized = sql.replace(/;$/, '').trim().toUpperCase().replace(/\s+/g, ' ');

    if (normalized.includes('FROM ASSETS')) {
      return Array.from(this.assetsTable.values()) as T[];
    }

    if (normalized.includes('FROM TRANSACTIONS WHERE ASSET_ID = ?')) {
      const [assetId] = params;
      const list: any[] = [];
      for (const tx of this.transactionsTable.values()) {
        if (tx.asset_id === assetId) {
          list.push(tx);
        }
      }
      return list.sort((a, b) => b.timestamp - a.timestamp) as T[];
    }

    if (normalized.includes('FROM TRANSACTIONS')) {
      const list = Array.from(this.transactionsTable.values());
      return list.sort((a, b) => b.timestamp - a.timestamp) as T[];
    }

    if (normalized.includes('FROM SETTINGS')) {
      return Array.from(this.settingsTable.values()) as T[];
    }

    return [];
  }
}
