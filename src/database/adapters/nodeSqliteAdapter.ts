import Database from 'better-sqlite3';
import { IDatabaseConnection } from '../db';

/**
 * 适用于 Node.js 环境与 Jest 测试的 SQLite 适配器
 */
export class NodeSqliteAdapter implements IDatabaseConnection {
  private db: Database.Database;

  constructor(filePathOrMemory: string = ':memory:') {
    this.db = new Database(filePathOrMemory);
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }

  public run(
    sql: string,
    params: any[] = []
  ): { changes: number; lastInsertRowId?: number } {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return {
      changes: info.changes,
      lastInsertRowId: Number(info.lastInsertRowid),
    };
  }

  public get<T>(sql: string, params: any[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as T | undefined;
    return row !== undefined ? row : null;
  }

  public all<T>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public close(): void {
    this.db.close();
  }
}
