import { requireOnline } from './status';
export function onlineFetch(input, options = {}) {
  requireOnline('This online service');
  return fetch(input, { ...options, signal: options.signal || AbortSignal.timeout(30000) });
}
