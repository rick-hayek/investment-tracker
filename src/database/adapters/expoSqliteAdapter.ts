import * as SQLite from 'expo-sqlite';
import { IDatabaseConnection } from '../db';

/**
 * 适用于 iOS / Android (React Native Expo) 的 SQLite 本地文件持久化适配器
 * 底层使用 expo-sqlite 原生模块将数据保存在 App 本地数据库文件 (如 investment_tracker.db)
 */
export class ExpoSqliteAdapter implements IDatabaseConnection {
  private db: SQLite.SQLiteDatabase;

  constructor(databaseName: string = 'investment_tracker.db') {
    this.db = SQLite.openDatabaseSync(databaseName);
  }

  public exec(sql: string): void {
    this.db.execSync(sql);
  }

  public run(
    sql: string,
    params: any[] = []
  ): { changes: number; lastInsertRowId?: number } {
    const info = this.db.runSync(sql, params as any);
    return {
      changes: info.changes,
      lastInsertRowId: info.lastInsertRowId,
    };
  }

  public get<T>(sql: string, params: any[] = []): T | null {
    const row = this.db.getFirstSync<T>(sql, params as any);
    return row !== null && row !== undefined ? row : null;
  }

  public all<T>(sql: string, params: any[] = []): T[] {
    const rows = this.db.getAllSync<T>(sql, params as any);
    return rows || [];
  }

  public close(): void {
    this.db.closeSync();
  }
}
