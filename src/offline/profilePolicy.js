// Only a server snapshot can confirm that an account was removed or disabled.
export function profileDecision(snapshot) {
  const valid = snapshot.exists() && snapshot.data().active === true &&
    ['admin', 'student'].includes(String(snapshot.data().role || '').toLowerCase());
  if (valid) return 'available';
  return snapshot.metadata.fromCache ? 'unavailable' : 'revoked';
}
