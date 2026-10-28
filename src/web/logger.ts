// Console logging that is only on in dev builds, or with ?debug in the URL.
// The engine never logs; the web shell logs actions and the events they cause.

declare const __DEV__: boolean;

type Level = 'debug' | 'info' | 'warn' | 'error';
const levelsInOrder: Level[] = ['debug', 'info', 'warn', 'error'];

function debugFromUrl(): boolean {
  try {
    return new URLSearchParams(location.search).has('debug');
  } catch {
    return false;
  }
}

export const logging = {
  enabled: (typeof __DEV__ !== 'undefined' && __DEV__) || debugFromUrl(),
  level: 'debug' as Level,
};

function log(level: Level, message: string, data?: unknown) {
  if (level !== 'error' && level !== 'warn' && !logging.enabled) return;
  if (levelsInOrder.indexOf(level) < levelsInOrder.indexOf(logging.level)) return;
  const line = `[labirinto] ${message}`;
  data === undefined ? console[level](line) : console[level](line, data);
}

export const logger = {
  debug: (message: string, data?: unknown) => log('debug', message, data),
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};
