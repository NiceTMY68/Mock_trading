import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
export class PortfolioModel {
  static async getOrCreate(userId) {
    const db = getDatabase();

    let result = await db.query(
      `SELECT * FROM portfolio WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {

      result = await db.query(
        `INSERT INTO portfolio (user_id, holdings, total_value_usd, total_cost_basis, total_pnl, total_pnl_percent)
         VALUES ($1, $2, 0, 0, 0, 0)
         RETURNING *`,
        [userId, JSON.stringify([])]
      );
    }

    return result.rows[0];
  }
  static async findByUserId(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM portfolio WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }
  static async update(userId, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.holdings !== undefined) {
      fields.push(`holdings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.holdings));
    }
    if (updates.totalValueUsd !== undefined) {
      fields.push(`total_value_usd = $${paramIndex++}`);
      values.push(updates.totalValueUsd);
    }
    if (updates.totalCostBasis !== undefined) {
      fields.push(`total_cost_basis = $${paramIndex++}`);
      values.push(updates.totalCostBasis);
    }
    if (updates.totalPnl !== undefined) {
      fields.push(`total_pnl = $${paramIndex++}`);
      values.push(updates.totalPnl);
    }
    if (updates.totalPnlPercent !== undefined) {
      fields.push(`total_pnl_percent = $${paramIndex++}`);
      values.push(updates.totalPnlPercent);
    }

    if (fields.length === 0) {
      return await this.findByUserId(userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await db.query(
      `UPDATE portfolio 
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }
  static async addHolding(userId, holding) {
    const portfolio = await this.getOrCreate(userId);
    const holdings = portfolio.holdings || [];
    
    const normalizedSymbol = holding.symbol.toUpperCase();
    const existingIndex = holdings.findIndex(h => h.symbol.toUpperCase() === normalizedSymbol);

    if (existingIndex >= 0) {

      holdings[existingIndex] = {
        ...holdings[existingIndex],
        ...holding,
        symbol: normalizedSymbol
      };
    } else {

      holdings.push({
        ...holding,
        symbol: normalizedSymbol
      });
    }

    return await this.update(userId, { holdings });
  }
  static async removeHolding(userId, symbol) {
    const portfolio = await this.getOrCreate(userId);
    const holdings = (portfolio.holdings || []).filter(
      h => h.symbol.toUpperCase() !== symbol.toUpperCase()
    );

    return await this.update(userId, { holdings });
  }
  static async calculateTotals(userId, currentPrices = {}) {
    const portfolio = await this.getOrCreate(userId);
    const holdings = portfolio.holdings || [];

    let totalValueUsd = 0;
    let totalCostBasis = 0;

    holdings.forEach(holding => {
      const currentPrice = currentPrices[holding.symbol] || holding.currentPrice || 0;
      const quantity = holding.quantity || 0;
      const avgPrice = holding.avgPrice || 0;

      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;

      totalValueUsd += currentValue;
      totalCostBasis += costBasis;
    });

    const totalPnl = totalValueUsd - totalCostBasis;
    const totalPnlPercent = totalCostBasis > 0 
      ? (totalPnl / totalCostBasis) * 100 
      : 0;

    return await this.update(userId, {
      totalValueUsd,
      totalCostBasis,
      totalPnl,
      totalPnlPercent
    });
  }
  static async createSnapshot(userId, snapshotData) {
    const db = getDatabase();
    
    const result = await db.query(
      `INSERT INTO portfolio_snapshots (user_id, total_value, daily_change, daily_change_percent, snapshot_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        snapshotData.totalValue,
        snapshotData.dailyChange || null,
        snapshotData.dailyChangePercent || null,
        JSON.stringify(snapshotData.snapshotData || {})
      ]
    );
    
    return result.rows[0];
  }
  static async getSnapshots(userId, days = 30) {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db.query(
      `SELECT * FROM portfolio_snapshots
       WHERE user_id = $1 AND created_at >= $2
       ORDER BY created_at ASC`,
      [userId, cutoffDate]
    );
    
    return result.rows;
  }
  static async getHistory(userId, days = 30) {
    return this.getSnapshots(userId, days);
  }
}

