import { Transaction } from '../../domain/types';
import { IDatabaseConnection, getDatabaseInstance } from '../db';

interface TransactionRow {
  id: string;
  asset_id: string;
  type: string;
  amount: number;
  price: number;
  fee: number | null;
  fee_currency: string | null;
  platform: string;
  timestamp: number;
  notes: string | null;
  created_at: number;
}

export class TransactionRepository {
  private db: IDatabaseConnection;

  constructor(db?: IDatabaseConnection) {
    this.db = db || getDatabaseInstance();
  }

  private mapRowToTransaction(row: TransactionRow): Transaction {
    return {
      id: row.id,
      assetId: row.asset_id,
      type: row.type as 'BUY' | 'SELL',
      amount: row.amount,
      price: row.price,
      fee: row.fee !== null ? row.fee : 0,
      feeCurrency: row.fee_currency || undefined,
      platform: row.platform as any,
      timestamp: row.timestamp,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    };
  }

  public async insert(tx: Transaction): Promise<void> {
    const sql = `
      INSERT INTO transactions (
        id, asset_id, type, amount, price, fee, fee_currency, platform, timestamp, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    await this.db.run(sql, [
      tx.id,
      tx.assetId,
      tx.type,
      tx.amount,
      tx.price,
      tx.fee || 0,
      tx.feeCurrency || 'USD',
      tx.platform,
      tx.timestamp,
      tx.notes || null,
      tx.createdAt,
    ]);
  }

  public async findById(id: string): Promise<Transaction | null> {
    const sql = `SELECT * FROM transactions WHERE id = ? LIMIT 1;`;
    const row = await this.db.get<TransactionRow>(sql, [id]);
    return row ? this.mapRowToTransaction(row) : null;
  }

  public async findByAssetId(
    assetId: string,
    order: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE asset_id = ? 
      ORDER BY timestamp ${order}, created_at ${order};
    `;
    const rows = await this.db.all<TransactionRow>(sql, [assetId]);
    return rows.map((r) => this.mapRowToTransaction(r));
  }

  public async findAll(order: 'ASC' | 'DESC' = 'DESC'): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      ORDER BY timestamp ${order}, created_at ${order};
    `;
    const rows = await this.db.all<TransactionRow>(sql);
    return rows.map((r) => this.mapRowToTransaction(r));
  }

  public async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM transactions WHERE id = ?;`;
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  public async deleteByAssetId(assetId: string): Promise<number> {
    const sql = `DELETE FROM transactions WHERE asset_id = ?;`;
    const result = await this.db.run(sql, [assetId]);
    return result.changes;
  }

  public async deleteAll(): Promise<void> {
    const sql = `DELETE FROM transactions;`;
    await this.db.run(sql);
  }
}
