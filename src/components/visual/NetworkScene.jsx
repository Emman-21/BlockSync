import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
const nodes = [[0,0,0], [-1.65,0.6,0.15], [1.5,0.9,-0.4], [1.2,-0.9,0.5], [-1.15,-0.8,-0.5]];
function Link({ end }) {
  const { midpoint, rotation, length } = useMemo(() => {
    const vector = new Vector3(...end);
    return { midpoint: vector.clone().multiplyScalar(0.5), rotation: new Quaternion().setFromUnitVectors(new Vector3(0,1,0), vector.clone().normalize()), length: vector.length() };
  }, [end]);
  return <mesh position={midpoint} quaternion={rotation}><cylinderGeometry args={[0.022,0.022,length,8]} /><meshStandardMaterial color="#a5b4fc" metalness={0.35} roughness={0.3} /></mesh>;
}
function Network() {
  const group = useRef();
  useFrame(({ clock, pointer }) => {
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.18 + pointer.x * 0.06;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.22) * 0.06 - pointer.y * 0.04;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.08;
  });
  return <group ref={group}>
    {nodes.slice(1).map((node, index) => <Link key={index} end={node} />)}
    {nodes.map((position,index) => <mesh key={index} position={position}><sphereGeometry args={[index ? 0.21 : 0.34,24,16]} /><meshStandardMaterial color={index ? '#a78bfa' : '#c7d2fe'} roughness={0.24} metalness={0.45} /></mesh>)}
  </group>;
}
export default function NetworkScene({ active }) {
  return <Canvas dpr={[1,1.5]} camera={{ position: [0,0,5], fov: 42 }} frameloop={active ? 'always' : 'never'} gl={{ antialias: true, powerPreference: 'low-power' }} fallback={<img src={`${import.meta.env.BASE_URL}network-fallback.svg`} alt="" />}>
    <ambientLight intensity={1.5} /><directionalLight position={[3,4,5]} intensity={3} /><Network />
  </Canvas>;
}
