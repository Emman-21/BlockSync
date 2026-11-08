import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import Card from './Card';
export default function TiltCard({ children, onClick, ...props }) {
  const node = useRef(null);
  const reduced = useReducedMotion();
  const reset = () => { if (node.current) node.current.style.transform = ''; };
  function move(event) {
    if (reduced || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    node.current.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
  }
  return <div onPointerMove={move} onPointerLeave={reset} onBlur={reset}>
    <div ref={node} style={{ transition: 'transform 180ms ease-out', transformStyle: 'preserve-3d' }}>
      <Card {...props} hoverable={false} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={event => {
        if (onClick && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onClick(event); }
      }}>{children}</Card>
    </div>
  </div>;
}
