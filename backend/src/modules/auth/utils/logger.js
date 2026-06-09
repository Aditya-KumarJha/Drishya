import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level.toUpperCase()}]: ${stack || message}`;
});

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  logFormat
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: consoleFormat,
  transports: [new winston.transports.Console()],
});

const morganStream = {
  write: (message) => logger.info(message.trimEnd()),
};

export { logger, morganStream };
