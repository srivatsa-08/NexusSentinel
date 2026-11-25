import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ShieldPadlockMesh({ hasIncident, pointerRef, reducedMotion }) {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const particlesRef = useRef();

  const shieldGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.05);
    shape.lineTo(0.88, 0.72);
    shape.quadraticCurveTo(0.92, -0.25, 0, -1.05);
    shape.quadraticCurveTo(-0.92, -0.25, -0.88, 0.72);
    shape.closePath();

    const extrudeSettings = {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 3
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }, []);

  const particlePositions = useMemo(() => {
    const count = 48;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.75 + (i % 3) * 0.35;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = ((i % 7) - 3) * 0.35;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 1.4) * 0.08;

    const targetRotY = pointerRef.current.x * 0.45;
    const targetRotX = -pointerRef.current.y * 0.28;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.08;
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.08;

    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.35;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.25;
    if (particlesRef.current) particlesRef.current.rotation.y = t * 0.12;
  });

  const accentColor = hasIncident ? "#f43f5e" : "#a855f7";

  return (
    <group>
      <group ref={groupRef}>
        {/* Shield Padlock Body */}
        <mesh geometry={shieldGeom}>
          <meshStandardMaterial
            color="#2E1065"
            metalness={0.78}
            roughness={0.26}
            emissive={accentColor}
            emissiveIntensity={0.22}
          />
        </mesh>

        {/* Curved Shackle */}
        <mesh position={[0, 1.05, 0]}>
          <torusGeometry args={[0.46, 0.085, 16, 48, Math.PI]} />
          <meshStandardMaterial color="#D8B4FE" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Keyhole */}
        <mesh position={[0, 0.08, 0.27]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
          <meshStandardMaterial color="#090610" emissive="#7C3AED" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, -0.14, 0.27]}>
          <boxGeometry args={[0.1, 0.28, 0.08]} />
          <meshStandardMaterial color="#090610" emissive="#7C3AED" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Holographic Rings Beneath Lock */}
      <mesh ref={ring1Ref} position={[0, -1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.02, 12, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.55} />
      </mesh>
      <mesh ref={ring2Ref} position={[0, -1.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.015, 12, 64]} />
        <meshBasicMaterial color="#D8B4FE" transparent opacity={0.35} />
      </mesh>

      {/* Subtle Surrounding Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#D8B4FE" transparent opacity={0.65} />
      </points>
    </group>
  );
}

export default function SecurityLock3D({ hasIncident }) {
  const pointerRef = useRef({ x: 0, y: 0 });
  const [webglOk, setWebglOk] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq) setReducedMotion(mq.matches);
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl") || c.getContext("experimental-webgl"))) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  if (!webglOk) {
    return (
      <div className="h-72 flex items-center justify-center rounded-xl border border-purple-900/50 bg-[#160D26]/60 text-xs text-purple-200 font-mono">
        3D Security Lock (WebGL Fallback Active)
      </div>
    );
  }

  return (
    <div
      className="h-80 w-full relative select-none"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerRef.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }}
      onPointerLeave={() => {
        pointerRef.current.x = 0;
        pointerRef.current.y = 0;
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.2, 4.6], fov: 42 }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <ambientLight intensity={0.65} />
        <pointLight position={[3, 4, 4]} intensity={1.6} color="#D8B4FE" />
        <pointLight position={[-4, -2, 3]} intensity={1.0} color="#7C3AED" />
        <ShieldPadlockMesh hasIncident={hasIncident} pointerRef={pointerRef} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
