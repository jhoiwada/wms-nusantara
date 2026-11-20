import pino from 'pino';
import { env } from '@/env';

function createLogger() {
  const isDev = env.NODE_ENV === 'development';

  if (isDev && typeof window === 'undefined') {
    try {
      // Di Next.js dev server, pino-pretty dijalankan sebagai stream sinkron langsung
      // tanpa worker-thread (thread-stream) guna mencegah error "unable to determine transport target"
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pretty = require('pino-pretty');
      return pino(
        { level: env.LOG_LEVEL },
        pretty({
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:HH:MM:ss',
          sync: true,
        }),
      );
    } catch {
      return pino({ level: env.LOG_LEVEL });
    }
  }

  return pino({ level: env.LOG_LEVEL });
}

export const logger = createLogger();
