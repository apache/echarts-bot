const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const { combine, timestamp, label, splat, printf } = format;

const drfTransport = new transports.DailyRotateFile({
    dirname: 'log',
    filename: 'bot-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '1m',
    maxFiles: '30d',
    createSymlink: true,
    zippedArchive: true
});

const errorStackHandler = format(e => {
  if (e.name === 'AggregateError') {
    return Object.assign({}, e, {
        message: e.message,
        stack: e.errors.map(err => err.stack).join('')
            + (e.event ? `\nEvent: ${JSON.stringify(e.event, null, 2)}` : '')
    });
  }
  if (e instanceof Error) {
    return Object.assign({}, e, {
        message: e.message,
        stack: e.stack
    });
  }
  return e;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      // still use the original(pino) console output
      // new transports.Console(),
      drfTransport
    ],
    exitOnError: false,
    format: combine(
        label({ label: 'BOT' }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errorStackHandler(),
        splat(),
        printf(({ level, message, label, timestamp, stack }) => {
            return `${timestamp} [${label}] ${level}: ${message} ${stack || ''}`;
        })
    )
});

module.exports = logger;
