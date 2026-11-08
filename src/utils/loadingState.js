// Cached content remains usable during refreshes, including refresh failures.
// A terminal error always wins over an initial loading flag.
export function getContentLoadState({ loading, hasData, hasLoaded = false, error }) {
  if (hasData) return error ? "stale" : loading ? "refreshing" : "ready";
  if (error) return "error";
  if (hasLoaded) return loading ? "refreshing" : "ready";
  return loading ? "loading" : "ready";
}
