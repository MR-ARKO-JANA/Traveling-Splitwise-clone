const levels = {
  info: '\x1b[36mINFO\x1b[0m', // Cyan
  warn: '\x1b[33mWARN\x1b[0m', // Yellow
  error: '\x1b[31mERROR\x1b[0m', // Red
  debug: '\x1b[35mDEBUG\x1b[0m', // Magenta
};

function formatError(err) {
  return {
    message: err.message,
    stack: err.stack,
    name: err.name,
  };
}

function log(level, message, meta) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    const logObj = {
      timestamp: new Date().toISOString(),
      level,
      message: message instanceof Error ? message.message : String(message),
    };

    if (message instanceof Error) {
      logObj.stack = message.stack;
    }

    if (meta !== undefined) {
      if (meta instanceof Error) {
        logObj.error = formatError(meta);
      } else if (typeof meta === 'object' && meta !== null) {
        logObj.metadata = {};
        for (const key of Object.keys(meta)) {
          if (meta[key] instanceof Error) {
            logObj.metadata[key] = formatError(meta[key]);
          } else {
            logObj.metadata[key] = meta[key];
          }
        }
      } else {
        logObj.metadata = meta;
      }
    }

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(logObj) + '\n');
  } else {
    const timestamp = new Date().toLocaleTimeString();
    const levelTag = levels[level] || level.toUpperCase();
    let metaStr = '';

    if (meta !== undefined) {
      if (meta instanceof Error) {
        metaStr = `\n\x1b[31m${meta.stack}\x1b[0m`;
      } else if (typeof meta === 'object' && meta !== null && Object.keys(meta).length > 0) {
        metaStr = ` ${JSON.stringify(meta)}`;
      } else if (typeof meta !== 'object') {
        metaStr = ` ${meta}`;
      }
    }

    const msgStr = message instanceof Error ? `\x1b[31m${message.stack}\x1b[0m` : message;
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] [${levelTag}] ${msgStr}${metaStr}`);
  }
}

const logger = {
  info(msg, meta) {
    log('info', msg, meta);
  },
  warn(msg, meta) {
    log('warn', msg, meta);
  },
  error(msg, meta) {
    log('error', msg, meta);
  },
  debug(msg, meta) {
    if (process.env.NODE_ENV !== 'production') {
      log('debug', msg, meta);
    }
  },
};

module.exports = logger;
