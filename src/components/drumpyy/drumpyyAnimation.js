// Elapsed active time keeps hidden tabs from running animation timers.
export function getDrumpyyFrame(pose, elapsed) {
  if (pose === "speaking") return [0, 4, 5, 4, 0, 4, 0][Math.floor(elapsed / 120) % 7];
  if (pose === "greeting" || pose === "happy") {
    if (elapsed < 1800) return [0, 2, 3, 2, 3, 2, 0][Math.min(6, Math.floor(elapsed / 250))];
  }
  const cycle = elapsed % (pose === "thinking" ? 2200 : 4200);
  return cycle >= 1800 && cycle < 1980 ? 1 : 0;
}
