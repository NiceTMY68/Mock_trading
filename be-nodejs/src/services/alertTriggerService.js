import { AlertModel } from '../models/alertModel.js';
import { logger } from '../utils/logger.js';
import { NotificationModel } from '../models/notificationModel.js';

/**
 * Check if alert condition is met
 */
function checkAlertCondition(alert, currentPrice, previousPrice = null) {
  const { condition, target_value } = alert;

  switch (condition) {
    case 'above':
      return currentPrice >= target_value;
    
    case 'below':
      return currentPrice <= target_value;
    
    case 'percent_change_up':
      if (!previousPrice || previousPrice === 0) return false;
      const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;
      return percentChange >= target_value;
    
    case 'percent_change_down':
      if (!previousPrice || previousPrice === 0) return false;
      const percentChangeDown = ((previousPrice - currentPrice) / previousPrice) * 100;
      return percentChangeDown >= target_value;
    
    default:
      logger.warn(`Unknown alert condition: ${condition}`);
      return false;
  }
}

/**
 * Process price update and check alerts
 */
export async function processPriceUpdate(symbol, currentPrice, previousPrice = null) {
  try {
    const alerts = await AlertModel.findActiveBySymbol(symbol);

    if (alerts.length === 0) {
      return;
    }

    logger.debug(`Checking ${alerts.length} active alerts for ${symbol}`);

    for (const alert of alerts) {
      try {
        const isTriggered = checkAlertCondition(alert, currentPrice, previousPrice);

        if (isTriggered) {
          // Mark alert as triggered
          await AlertModel.markTriggered(alert.id, currentPrice);

          // Create notification
          const message = generateAlertMessage(alert, currentPrice);
          await NotificationModel.create({
            userId: alert.user_id,
            type: 'alert',
            title: 'Price Alert Triggered',
            message,
            data: {
              alertId: alert.id,
              symbol: alert.symbol,
              condition: alert.condition,
              targetValue: alert.target_value,
              triggeredPrice: currentPrice
            }
          });

          logger.info(`Alert ${alert.id} triggered for ${symbol} at $${currentPrice}`);
        }
      } catch (error) {
        logger.error(`Error processing alert ${alert.id}:`, error);
      }
    }
  } catch (error) {
    logger.error(`Error processing price update for ${symbol}:`, error);
  }
}

/**
 * Generate alert message
 */
function generateAlertMessage(alert, triggeredPrice) {
  const { symbol, condition, target_value } = alert;
  
  switch (condition) {
    case 'above':
      return `${symbol} reached $${triggeredPrice.toFixed(2)} (target: $${target_value})`;
    
    case 'below':
      return `${symbol} dropped to $${triggeredPrice.toFixed(2)} (target: $${target_value})`;
    
    case 'percent_change_up':
      return `${symbol} increased by ${target_value}% to $${triggeredPrice.toFixed(2)}`;
    
    case 'percent_change_down':
      return `${symbol} decreased by ${target_value}% to $${triggeredPrice.toFixed(2)}`;
    
    default:
      return `${symbol} alert triggered at $${triggeredPrice.toFixed(2)}`;
  }
}

/**
 * Initialize alert checking (called when price updates come in)
 */
export function initializeAlertChecker(priceUpdateCallback) {
  // This will be called from WebSocket price stream
  // when prices are updated
  return priceUpdateCallback;
}

