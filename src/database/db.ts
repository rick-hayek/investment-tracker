import { ALL_MIGRATIONS } from './schema';

/**
 * 跨端统一的 SQLite 执行接口
 * 允许在 React Native (expo-sqlite) 和测试环境 (better-sqlite3 / mock) 无缝切换
 */
export interface IDatabaseConnection {
  exec(sql: string): Promise<void> | void;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowId?: number }> | { changes: number; lastInsertRowId?: number };
  get<T>(sql: string, params?: any[]): Promise<T | null> | (T | null);
  all<T>(sql: string, params?: any[]): Promise<T[]> | T[];
}

let activeDb: IDatabaseConnection | null = null;

export function setDatabaseInstance(db: IDatabaseConnection) {
  activeDb = db;
}

export function getDatabaseInstance(): IDatabaseConnection {
  if (!activeDb) {
    throw new Error('Database instance has not been initialized. Please call initDatabase() first.');
  }
  return activeDb;
}

/**
 * 初始化并执行所有数据库迁移表结构创建
 */
export async function runMigrations(db: IDatabaseConnection): Promise<void> {
  // 开启外键支持
  await db.exec('PRAGMA foreign_keys = ON;');
  
  for (const query of ALL_MIGRATIONS) {
    await db.exec(query);
  }
}
