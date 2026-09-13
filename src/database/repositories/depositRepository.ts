import { Deposit, PlatformType } from '../../domain/types';
import { IDatabaseConnection, getDatabaseInstance } from '../db';

interface DepositRow {
  id: string;
  type?: string;
  platform: string;
  currency: string;
  amount: number;
  timestamp: number;
  notes: string | null;
  created_at: number;
}

export class DepositRepository {
  private db: IDatabaseConnection;

  constructor(db?: IDatabaseConnection) {
    this.db = db || getDatabaseInstance();
  }

  private mapRowToDeposit(row: DepositRow): Deposit {
    return {
      id: row.id,
      type: (row.type === 'WITHDRAW' ? 'WITHDRAW' : 'DEPOSIT'),
      platform: row.platform as PlatformType,
      currency: row.currency as any,
      amount: row.amount,
      timestamp: row.timestamp,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    };
  }

  public async insert(deposit: Deposit): Promise<void> {
    const sql = `
      INSERT INTO deposits (
        id, type, platform, currency, amount, timestamp, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    await this.db.run(sql, [
      deposit.id,
      deposit.type || 'DEPOSIT',
      deposit.platform,
      deposit.currency,
      deposit.amount,
      deposit.timestamp,
      deposit.notes || null,
      deposit.createdAt,
    ]);
  }

  public async findById(id: string): Promise<Deposit | null> {
    const sql = `SELECT * FROM deposits WHERE id = ? LIMIT 1;`;
    const row = await this.db.get<DepositRow>(sql, [id]);
    return row ? this.mapRowToDeposit(row) : null;
  }

  public async findByPlatform(
    platform: PlatformType,
    order: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Deposit[]> {
    const sql = `
      SELECT * FROM deposits
      WHERE platform = ?
      ORDER BY timestamp ${order}, created_at ${order};
    `;
    const rows = await this.db.all<DepositRow>(sql, [platform]);
    return rows.map((r) => this.mapRowToDeposit(r));
  }

  public async findAll(order: 'ASC' | 'DESC' = 'DESC'): Promise<Deposit[]> {
    const sql = `
      SELECT * FROM deposits
      ORDER BY timestamp ${order}, created_at ${order};
    `;
    const rows = await this.db.all<DepositRow>(sql);
    return rows.map((r) => this.mapRowToDeposit(r));
  }

  public async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM deposits WHERE id = ?;`;
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  public async deleteAll(): Promise<void> {
    const sql = `DELETE FROM deposits;`;
    await this.db.run(sql);
  }
}
