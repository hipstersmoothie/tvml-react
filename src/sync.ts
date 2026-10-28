// Discrete input (presses, typing) is applied synchronously, like React DOM
// does for clicks and keystrokes: state updates from a handler are committed
// before the handler returns. The reconciler registers its flushSync here to
// avoid an import cycle with the host config.

let flush: <R>(fn: () => R) => R = (fn) => fn();

export function setFlushSync(fn: <R>(fn: () => R) => R): void {
  flush = fn;
}

export function runDiscrete<R>(fn: () => R): R {
  return flush(fn);
}
