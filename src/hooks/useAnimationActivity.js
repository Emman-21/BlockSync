import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export default function useAnimationActivity(paused = false) {
  const elementRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [inactive, setInactive] = useState(true);

  useEffect(() => {
    let visible = typeof IntersectionObserver === "undefined";
    const sync = () => setInactive(paused || document.hidden || !visible);
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); })
      : null;
    if (elementRef.current) observer?.observe(elementRef.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused]);

  return { elementRef, paused: inactive, reduceMotion: Boolean(reduceMotion) };
}
