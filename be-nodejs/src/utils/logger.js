const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.LOG_LEVEL || 'INFO';

const shouldLog = (level) => {
  return logLevels[level] <= logLevels[currentLevel];
};

export const logger = {
  error: (...args) => {
    if (shouldLog('ERROR')) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },
  warn: (...args) => {
    if (shouldLog('WARN')) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  info: (...args) => {
    if (shouldLog('INFO')) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  debug: (...args) => {
    if (shouldLog('DEBUG')) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  }
};

