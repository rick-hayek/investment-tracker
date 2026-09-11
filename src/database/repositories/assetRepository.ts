import { Asset } from '../../domain/types';
import { IDatabaseConnection, getDatabaseInstance } from '../db';

interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  platform: string;
  icon_url: string | null;
  created_at: number;
}

export class AssetRepository {
  private db: IDatabaseConnection;

  constructor(db?: IDatabaseConnection) {
    this.db = db || getDatabaseInstance();
  }

  private mapRowToAsset(row: AssetRow): Asset {
    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      platform: row.platform as any,
      iconUrl: row.icon_url || undefined,
      createdAt: row.created_at,
    };
  }

  public async insert(asset: Asset): Promise<void> {
    const sql = `
      INSERT INTO assets (id, symbol, name, platform, icon_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    await this.db.run(sql, [
      asset.id,
      asset.symbol,
      asset.name,
      asset.platform,
      asset.iconUrl || null,
      asset.createdAt,
    ]);
  }

  public async update(asset: Asset): Promise<void> {
    const sql = `
      UPDATE assets 
      SET symbol = ?, name = ?, platform = ?, icon_url = ?
      WHERE id = ?;
    `;
    await this.db.run(sql, [
      asset.symbol,
      asset.name,
      asset.platform,
      asset.iconUrl || null,
      asset.id,
    ]);
  }

  public async findById(id: string): Promise<Asset | null> {
    const sql = `SELECT * FROM assets WHERE id = ? LIMIT 1;`;
    const row = await this.db.get<AssetRow>(sql, [id]);
    return row ? this.mapRowToAsset(row) : null;
  }

  public async findBySymbol(symbol: string): Promise<Asset | null> {
    const sql = `SELECT * FROM assets WHERE UPPER(symbol) = UPPER(?) LIMIT 1;`;
    const row = await this.db.get<AssetRow>(sql, [symbol]);
    return row ? this.mapRowToAsset(row) : null;
  }

  public async findAll(): Promise<Asset[]> {
    const sql = `SELECT * FROM assets ORDER BY created_at ASC;`;
    const rows = await this.db.all<AssetRow>(sql);
    return rows.map((r) => this.mapRowToAsset(r));
  }

  public async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM assets WHERE id = ?;`;
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }
}
