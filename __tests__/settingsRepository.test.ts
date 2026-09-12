import { NodeSqliteAdapter } from '../src/database/adapters/nodeSqliteAdapter';
import { runMigrations, setDatabaseInstance } from '../src/database/db';
import { SettingsRepository, DEFAULT_USER_SETTINGS } from '../src/database/repositories/settingsRepository';

describe('SettingsRepository (用户偏好配置持久化测试)', () => {
  let db: NodeSqliteAdapter;
  let settingsRepo: SettingsRepository;

  beforeEach(async () => {
    db = new NodeSqliteAdapter(':memory:');
    setDatabaseInstance(db);
    await runMigrations(db);
    settingsRepo = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('初始未配置时返回系统默认用户偏好', async () => {
    const settings = await settingsRepo.getSettings();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
    expect(settings.baseCurrency).toBe('USD');
    expect(settings.privacyMode).toBe(false);
    expect(settings.appSwitcherBlur).toBe(true);
    expect(settings.language).toBe('zh');
  });

  it('成功更新并持久化部分配置项', async () => {
    const updated = await settingsRepo.updateSettings({
      baseCurrency: 'CNY',
      privacyMode: true,
      language: 'en',
    });

    expect(updated.baseCurrency).toBe('CNY');
    expect(updated.privacyMode).toBe(true);
    expect(updated.appSwitcherBlur).toBe(true); // 保持原有默认值
    expect(updated.language).toBe('en');

    // 重新从数据库读取确认持久化落盘
    const reloaded = await settingsRepo.getSettings();
    expect(reloaded.baseCurrency).toBe('CNY');
    expect(reloaded.privacyMode).toBe(true);
    expect(reloaded.language).toBe('en');
  });

  it('多次连续更新能正确增量合并', async () => {
    await settingsRepo.updateSettings({ baseCurrency: 'EUR' });
    await settingsRepo.updateSettings({ appSwitcherBlur: false });

    const settings = await settingsRepo.getSettings();
    expect(settings.baseCurrency).toBe('EUR');
    expect(settings.appSwitcherBlur).toBe(false);
    expect(settings.privacyMode).toBe(false);
  });

  it('重置配置能还原出厂默认', async () => {
    await settingsRepo.updateSettings({ baseCurrency: 'CNY', privacyMode: true });
    const reset = await settingsRepo.resetSettings();
    expect(reset).toEqual(DEFAULT_USER_SETTINGS);

    const reloaded = await settingsRepo.getSettings();
    expect(reloaded).toEqual(DEFAULT_USER_SETTINGS);
  });
});
