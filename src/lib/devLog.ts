export function devLog(level: 'log' | 'warn' | 'error', ...args: unknown[]): void {
  if (import.meta.env.PROD) return;
  import.meta.hot?.send('app:log', { level, args: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)) });
}

export function dlog(...args: unknown[]): void { devLog('log', ...args); }
export function dwarn(...args: unknown[]): void { devLog('warn', ...args); }
export function derr(...args: unknown[]): void { devLog('error', ...args); }
