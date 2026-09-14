import { Platform } from 'react-native';
import { ALL_MIGRATIONS } from './schema';
import { MemorySqliteAdapter } from './adapters/memorySqliteAdapter';

/**
 * 跨端统一的 SQLite 执行接口
 * 允许在 React Native (expo-sqlite) 和测试环境 (better-sqlite3 / mock) 无缝切换
 */
export interface IDatabaseConnection {
  exec(sql: string): Promise<void> | void;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowId?: number }> | { changes: number; lastInsertRowId?: number };
  get<T>(sql: string, params?: any[]): Promise<T | null> | (T | null);
  all<T>(sql: string, params?: any[]): Promise<T[]> | T[];
  close?(): Promise<void> | void;
}

let activeDb: IDatabaseConnection | null = null;

export function setDatabaseInstance(db: IDatabaseConnection) {
  activeDb = db;
}

export function getDatabaseInstance(): IDatabaseConnection {
  if (!activeDb) {
    if (Platform && Platform.OS === 'web') {
      activeDb = new MemorySqliteAdapter();
    } else {
      try {
        // 在原生环境 (iOS / Android) 动态引入 ExpoSqliteAdapter 读写本地 SQLite 文件
        const { ExpoSqliteAdapter } = require('./adapters/expoSqliteAdapter');
        activeDb = new ExpoSqliteAdapter('investment_tracker.db');
      } catch (err) {
        console.warn('ExpoSqliteAdapter 初始化异常，降级使用 MemorySqliteAdapter:', err);
        activeDb = new MemorySqliteAdapter();
      }
    }
  }
  return activeDb!;
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

  // 增量迁移: 补充 deposits.type 字段
  try {
    await db.exec("ALTER TABLE deposits ADD COLUMN type TEXT DEFAULT 'DEPOSIT';");
  } catch {
    // 字段已存在时忽略错误
  }
}

/**
 * 初始化全局数据库连接并执行表结构迁移
 */
export async function initializeDatabase(): Promise<IDatabaseConnection> {
  const db = getDatabaseInstance();
  await runMigrations(db);
  return db;
}
