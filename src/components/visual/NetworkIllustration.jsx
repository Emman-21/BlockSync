import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
const Scene = lazy(() => import('./NetworkScene'));
const fallback = <img className="h-full w-full object-contain" src={`${import.meta.env.BASE_URL}network-fallback.svg`} alt="" />;
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? fallback : this.props.children; }
}
export default function NetworkIllustration() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const lowPower = (navigator.deviceMemory && navigator.deviceMemory < 4) || navigator.connection?.saveData;
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting));
    observer.observe(ref.current);
    const update = () => setForeground(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <div ref={ref} className="h-44 w-full max-w-md mt-4" aria-hidden="true">
    {!reduced && !lowPower && visible ? <SceneBoundary><Suspense fallback={fallback}><Scene active={foreground && visible} /></Suspense></SceneBoundary> : fallback}
  </div>;
}
