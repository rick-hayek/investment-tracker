import { UserSettings } from '../../domain/types';
import { IDatabaseConnection, getDatabaseInstance } from '../db';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  baseCurrency: 'USD',
  privacyMode: false,
  appSwitcherBlur: true,
  theme: 'dark',
  language: 'zh',
};

export class SettingsRepository {
  private db: IDatabaseConnection;

  constructor(db?: IDatabaseConnection) {
    this.db = db || getDatabaseInstance();
  }

  /**
   * 读取用户配置，若未存储则返回默认配置
   */
  public async getSettings(): Promise<UserSettings> {
    try {
      const row = await this.db.get<{ key: string; value: string }>(
        `SELECT value FROM settings WHERE key = ?;`,
        ['user_settings']
      );

      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        return {
          ...DEFAULT_USER_SETTINGS,
          ...parsed,
        };
      }
    } catch (err) {
      console.warn('Failed to load user settings, returning defaults:', err);
    }
    return { ...DEFAULT_USER_SETTINGS };
  }

  /**
   * 更新或部分更新用户配置
   */
  public async updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...partial,
    };

    const sql = `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `;

    await this.db.run(sql, ['user_settings', JSON.stringify(updated)]);
    return updated;
  }

  /**
   * 重置用户配置为出厂默认
   */
  public async resetSettings(): Promise<UserSettings> {
    await this.db.run(`DELETE FROM settings WHERE key = ?;`, ['user_settings']);
    return { ...DEFAULT_USER_SETTINGS };
  }
}
