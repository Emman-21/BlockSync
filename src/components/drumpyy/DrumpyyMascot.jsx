import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import spriteSheet from "../../assets/drumpyy/drumpyy-animation-sheet.png";
import { getDrumpyyFrame } from "./drumpyyAnimation";

// Transparent frames: idle, blink, wave high, wave out, talk small, talk wide.
const POSITIONS = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%", "100% 100%"];

export default function DrumpyyMascot({ pose = "idle", className = "", paused = false }) {
  const reduceMotion = useReducedMotion();
  const elementRef = useRef(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reduceMotion || paused) return undefined;
    let timer;
    let visible = true;
    let elapsed = 0;
    let lastTick = performance.now();
    const tick = () => {
      const now = performance.now();
      elapsed += now - lastTick;
      lastTick = now;
      setFrame(getDrumpyyFrame(pose, elapsed));
    };
    const sync = () => {
      window.clearInterval(timer);
      timer = undefined;
      if (visible && !document.hidden) {
        lastTick = performance.now();
        timer = window.setInterval(tick, 90);
      }
    };
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); })
      : null;
    if (elementRef.current) observer?.observe(elementRef.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [pose, reduceMotion, paused]);

  return (
    <motion.div
      ref={elementRef}
      role="img"
      aria-label={`Drumpyy ${pose}`}
      data-drumpyy-pose={pose}
      data-drumpyy-frame={reduceMotion || paused ? 0 : frame}
      className={`relative inline-block overflow-hidden ${className}`}
      initial={reduceMotion || paused ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion || paused ? 0 : 0.5, ease: "easeOut" }}
    >
      <span aria-hidden="true" style={{
        display: "block", width: "100%", aspectRatio: "1", pointerEvents: "none",
        backgroundImage: `url(${spriteSheet})`, backgroundSize: "300% 200%",
        // Exclude the neighboring wave tip in the small-mouth sprite tile.
        clipPath: frame === 4 && !reduceMotion && !paused ? "inset(0 0 0 11%)" : undefined,
        backgroundRepeat: "no-repeat", backgroundPosition: POSITIONS[reduceMotion || paused ? 0 : frame],
      }} />
    </motion.div>
  );
}
