// Polyfill AbortSignal.any — not implemented in React Native / Hermes
// Required by @firebase/ai SDK
if (typeof AbortSignal !== 'undefined' && !AbortSignal.any) {
  (AbortSignal as any).any = (signals: AbortSignal[]) => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
  };
}

import 'expo-router/entry';
