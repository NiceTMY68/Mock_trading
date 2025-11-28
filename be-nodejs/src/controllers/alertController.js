import { validationResult } from 'express-validator';
import { AlertModel } from '../models/alertModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';
import { getBinanceService } from '../services/binanceService.js';

/**
 * Get all alerts for current user
 * GET /api/alerts
 */
export const getAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { includeInactive } = req.query;

    const alerts = await AlertModel.findByUserId(userId, includeInactive === 'true');

    res.json(createResponse(true, 'Alerts retrieved', {
      alerts: alerts.map(a => ({
        id: a.id,
        symbol: a.symbol,
        condition: a.condition,
        targetValue: parseFloat(a.target_value),
        isActive: a.is_active,
        notes: a.notes,
        triggeredAt: a.triggered_at,
        triggeredPrice: a.triggered_price ? parseFloat(a.triggered_price) : null,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }))
    }));
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get alert by ID
 * GET /api/alerts/:id
 */
export const getAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const alert = await AlertModel.findById(parseInt(id), userId);

    if (!alert) {
      return res.status(404).json(createResponse(false, 'Alert not found'));
    }

    res.json(createResponse(true, 'Alert retrieved', {
      alert: {
        id: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
        targetValue: parseFloat(alert.target_value),
        isActive: alert.is_active,
        notes: alert.notes,
        triggeredAt: alert.triggered_at,
        triggeredPrice: alert.triggered_price ? parseFloat(alert.triggered_price) : null,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      }
    }));
  } catch (error) {
    logger.error('Get alert error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create new alert
 * POST /api/alerts
 */
export const createAlert = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { symbol, condition, targetValue, notes } = req.body;

    // Validate condition
    const validConditions = ['above', 'below', 'percent_change_up', 'percent_change_down'];
    if (!validConditions.includes(condition)) {
      return res.status(400).json(createResponse(false, 'Invalid condition'));
    }

    // Get current price to validate
    try {
      const binanceService = getBinanceService();
      const priceData = await binanceService.getLatestPrice(symbol);
      const currentPrice = priceData.price || priceData.lastPrice || 0;

      if (currentPrice === 0) {
        return res.status(400).json(createResponse(false, 'Invalid symbol or unable to fetch price'));
      }
    } catch (error) {
      logger.warn(`Failed to fetch price for ${symbol}:`, error.message);
      // Continue anyway - alert will be checked when price updates come in
    }

    const alert = await AlertModel.create(userId, {
      symbol,
      condition,
      targetValue: parseFloat(targetValue),
      notes: notes || null
    });

    logger.info(`Alert created: ${alert.id} for user ${userId}`);

    res.status(201).json(createResponse(true, 'Alert created', {
      alert: {
        id: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
        targetValue: parseFloat(alert.target_value),
        isActive: alert.is_active,
        notes: alert.notes,
        createdAt: alert.created_at
      }
    }));
  } catch (error) {
    logger.error('Create alert error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update alert
 * PUT /api/alerts/:id
 */
export const updateAlert = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { id } = req.params;
    const { condition, targetValue, isActive, notes } = req.body;

    const updates = {};
    if (condition !== undefined) {
      const validConditions = ['above', 'below', 'percent_change_up', 'percent_change_down'];
      if (!validConditions.includes(condition)) {
        return res.status(400).json(createResponse(false, 'Invalid condition'));
      }
      updates.condition = condition;
    }
    if (targetValue !== undefined) {
      updates.targetValue = parseFloat(targetValue);
    }
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const alert = await AlertModel.update(parseInt(id), userId, updates);

    if (!alert) {
      return res.status(404).json(createResponse(false, 'Alert not found or unauthorized'));
    }

    res.json(createResponse(true, 'Alert updated', {
      alert: {
        id: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
        targetValue: parseFloat(alert.target_value),
        isActive: alert.is_active,
        notes: alert.notes,
        updatedAt: alert.updated_at
      }
    }));
  } catch (error) {
    logger.error('Update alert error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete alert
 * DELETE /api/alerts/:id
 */
export const deleteAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const alert = await AlertModel.delete(parseInt(id), userId);

    if (!alert) {
      return res.status(404).json(createResponse(false, 'Alert not found or unauthorized'));
    }

    logger.info(`Alert deleted: ${id} by user ${userId}`);

    res.json(createResponse(true, 'Alert deleted'));
  } catch (error) {
    logger.error('Delete alert error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get alert history (triggered alerts)
 * GET /api/alerts/history
 */
export const getAlertHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50 } = req.query;

    const history = await AlertModel.getHistory(userId, parseInt(limit));

    res.json(createResponse(true, 'Alert history retrieved', {
      history: history.map(a => ({
        id: a.id,
        symbol: a.symbol,
        condition: a.condition,
        targetValue: parseFloat(a.target_value),
        triggeredAt: a.triggered_at,
        triggeredPrice: a.triggered_price ? parseFloat(a.triggered_price) : null,
        notes: a.notes,
        createdAt: a.created_at
      }))
    }));
  } catch (error) {
    logger.error('Get alert history error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

