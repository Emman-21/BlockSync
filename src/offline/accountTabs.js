// Account changes need exclusive access so another tab cannot submit under a new UID.
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('itnt3108-account-tabs-v1') : null;
channel?.addEventListener('message', event => {
  if (event.data?.type === 'who-is-open') channel.postMessage({ type: 'tab-open', request: event.data.request });
});
export async function requireSingleAccountTab() {
  if (!channel) return;
  const request = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    let otherTab = false;
    const handler = event => { if (event.data?.type === 'tab-open' && event.data.request === request) otherTab = true; };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'who-is-open', request });
    setTimeout(() => {
      channel.removeEventListener('message', handler);
      if (otherTab) reject(new Error('Close the other tabs of this app before signing in, switching accounts, or clearing saved data.'));
      else resolve();
    }, 250);
  });
}
