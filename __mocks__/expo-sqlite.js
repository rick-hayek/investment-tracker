const Database = require('better-sqlite3');

class MockSQLiteDatabase {
  constructor(databaseName = ':memory:') {
    this.databasePath = databaseName;
    // In jest tests, default to in-memory better-sqlite3 database
    this.db = new Database(':memory:');
  }

  execSync(source) {
    this.db.exec(source);
  }

  runSync(source, params = []) {
    const bindParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const stmt = this.db.prepare(source);
    const info = stmt.run(...bindParams);
    return {
      changes: info.changes,
      lastInsertRowId: Number(info.lastInsertRowid),
    };
  }

  getFirstSync(source, params = []) {
    const bindParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const stmt = this.db.prepare(source);
    const row = stmt.get(...bindParams);
    return row !== undefined ? row : null;
  }

  getAllSync(source, params = []) {
    const bindParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const stmt = this.db.prepare(source);
    return stmt.all(...bindParams);
  }

  closeSync() {
    this.db.close();
  }
}

function openDatabaseSync(databaseName, options) {
  return new MockSQLiteDatabase(databaseName);
}

module.exports = {
  SQLiteDatabase: MockSQLiteDatabase,
  openDatabaseSync,
};
