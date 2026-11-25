import { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

/* ─── Shield geometry ─────────────────────────────────────────── */
function buildShieldShape(scale = 1) {
  const shape = new THREE.Shape();
  const s = scale;
  shape.moveTo(0,  2.1 * s);
  shape.bezierCurveTo( 1.1*s,  2.1*s,  1.75*s,  1.6*s,  1.75*s,  0.8*s);
  shape.bezierCurveTo( 1.75*s, -0.3*s,  1.0*s, -1.3*s,  0,       -2.2*s);
  shape.bezierCurveTo(-1.0*s, -1.3*s, -1.75*s, -0.3*s, -1.75*s,  0.8*s);
  shape.bezierCurveTo(-1.75*s,  1.6*s, -1.1*s,  2.1*s,  0,        2.1*s);
  return shape;
}

/* ─── Shield mesh ─────────────────────────────────────────────── */
function ShieldBody({ hasIncident }) {
  const outerRef = useRef();
  const innerRef = useRef();
  const rimRef   = useRef();

  const { outerGeo, innerGeo } = useMemo(() => {
    const outerShape = buildShieldShape(1);
    const innerShape = buildShieldShape(0.78);

    const extOpts = { depth: 0.38, bevelEnabled: true, bevelThickness: 0.10, bevelSize: 0.07, bevelSegments: 6 };
    const extOptsInner = { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 5 };

    return {
      outerGeo: new THREE.ExtrudeGeometry(outerShape, extOpts),
      innerGeo: new THREE.ExtrudeGeometry(innerShape, extOptsInner),
    };
  }, []);

  useEffect(() => {
    return () => {
      outerGeo.dispose();
      innerGeo.dispose();
    };
  }, [outerGeo, innerGeo]);

  useFrame(({ clock, mouse }) => {
    const t = clock.getElapsedTime();
    const targetRX = mouse.y * 0.18;
    const targetRY = mouse.x * 0.22;

    if (outerRef.current) {
      outerRef.current.rotation.x += (targetRX - outerRef.current.rotation.x) * 0.055;
      outerRef.current.rotation.y += (targetRY - outerRef.current.rotation.y) * 0.055;
      outerRef.current.position.y = Math.sin(t * 1.1) * 0.08;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x = outerRef.current?.rotation.x || 0;
      innerRef.current.rotation.y = outerRef.current?.rotation.y || 0;
      innerRef.current.position.y = (outerRef.current?.position.y || 0) + 0.09;
      // breathing emissive
      innerRef.current.material.emissiveIntensity = 0.18 + Math.sin(t * 2.2) * 0.09;
    }
    if (rimRef.current) {
      rimRef.current.rotation.x = outerRef.current?.rotation.x || 0;
      rimRef.current.rotation.y = outerRef.current?.rotation.y || 0;
      rimRef.current.position.y = (outerRef.current?.position.y || 0);
      rimRef.current.material.emissiveIntensity = 0.5 + Math.sin(t * 1.8 + 1) * 0.3;
    }
  });

  const outerColor = hasIncident ? "#3B0B0B" : "#1a0533";
  const rimColor   = hasIncident ? "#F87171" : "#C084FC";

  return (
    <group>
      {/* Outer frame */}
      <mesh ref={outerRef} geometry={outerGeo} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={outerColor}
          metalness={0.92}
          roughness={0.12}
          envMapIntensity={1.6}
        />
      </mesh>

      {/* Inner plate (recessed) */}
      <mesh ref={innerRef} geometry={innerGeo} position={[0, 0.09, 0.08]}>
        <meshStandardMaterial
          color={hasIncident ? "#3f0000" : "#2E1065"}
          metalness={0.72}
          roughness={0.28}
          emissive={hasIncident ? "#7f0000" : "#7C3AED"}
          emissiveIntensity={0.18}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Rim accent strip (thin torus-like shape along perimeter) */}
      <mesh ref={rimRef} position={[0, 0, 0.19]}>
        <torusGeometry args={[1.56, 0.03, 8, 80, Math.PI * 2]} />
        <meshStandardMaterial
          color={rimColor}
          emissive={rimColor}
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.08}
        />
      </mesh>
    </group>
  );
}

/* ─── Shackle (U-arc padlock bow) ────────────────────────────── */
function Shackle({ hasIncident }) {
  const groupRef = useRef();
  const { viewport } = useThree();

  useFrame(({ clock, mouse }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    groupRef.current.rotation.x += ((mouse.y * 0.18) - groupRef.current.rotation.x) * 0.055;
    groupRef.current.rotation.y += ((mouse.x * 0.22) - groupRef.current.rotation.y) * 0.055;
    groupRef.current.position.y = Math.sin(t * 1.1) * 0.08 + 1.6;
  });

  const color = hasIncident ? "#F87171" : "#C084FC";

  return (
    <group ref={groupRef} position={[0, 1.6, 0.26]}>
      {/* Arc */}
      <mesh>
        <torusGeometry args={[0.52, 0.10, 16, 40, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.95} roughness={0.08} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      {/* Left post */}
      <mesh position={[-0.52, -0.38, 0]}>
        <cylinderGeometry args={[0.10, 0.10, 0.76, 16]} />
        <meshStandardMaterial color={color} metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Right post */}
      <mesh position={[0.52, -0.38, 0]}>
        <cylinderGeometry args={[0.10, 0.10, 0.76, 16]} />
        <meshStandardMaterial color={color} metalness={0.95} roughness={0.08} />
      </mesh>
    </group>
  );
}

/* ─── Keyhole ─────────────────────────────────────────────────── */
function Keyhole({ hasIncident }) {
  const groupRef = useRef();
  useFrame(({ clock, mouse }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += ((mouse.y * 0.18) - groupRef.current.rotation.x) * 0.055;
    groupRef.current.rotation.y += ((mouse.x * 0.22) - groupRef.current.rotation.y) * 0.055;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.1) * 0.08 - 0.1;
  });

  const color = hasIncident ? "#FCA5A5" : "#E9D5FF";

  return (
    <group ref={groupRef} position={[0, -0.1, 0.42]}>
      <mesh position={[0, 0.14, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.16, 0.38, 0.04]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} emissive={color} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/* ─── Circuit etching lines ──────────────────────────────────── */
function CircuitLines({ hasIncident }) {
  const groupRef = useRef();
  useFrame(({ clock, mouse }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += ((mouse.y * 0.18) - groupRef.current.rotation.x) * 0.055;
    groupRef.current.rotation.y += ((mouse.x * 0.22) - groupRef.current.rotation.y) * 0.055;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.1) * 0.08;
    const ei = 0.4 + Math.sin(clock.getElapsedTime() * 3) * 0.25;
    groupRef.current.children.forEach(c => {
      if (c.material) c.material.emissiveIntensity = ei;
    });
  });

  const color = hasIncident ? "#F87171" : "#A855F7";

  return (
    <group ref={groupRef} position={[0, 0, 0.32]}>
      {CIRCUIT_SEGS.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, 0, s.rot ?? 0]}>
          <boxGeometry args={[s.w, s.h, 0.018]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

const CIRCUIT_SEGS = [
  { pos: [-0.80,  0.60, 0], w: 0.42, h: 0.025, rot: 0 },
  { pos: [-0.90,  0.30, 0], w: 0.025, h: 0.38, rot: 0 },
  { pos: [ 0.75,  0.55, 0], w: 0.38, h: 0.025, rot: 0 },
  { pos: [ 0.90,  0.20, 0], w: 0.025, h: 0.42, rot: 0 },
  { pos: [-0.50, -0.80, 0], w: 0.30, h: 0.025, rot: 0 },
  { pos: [ 0.50, -0.75, 0], w: 0.30, h: 0.025, rot: 0 },
  { pos: [ 0,     0.90, 0], w: 0.50, h: 0.025, rot: 0 },
  { pos: [-0.60,  0,    0], w: 0.025, h: 0.30, rot: 0 },
  { pos: [ 0.65,  0,    0], w: 0.025, h: 0.30, rot: 0 },
];

/* ─── Orbital rings ──────────────────────────────────────────── */
function OrbitalRings({ hasIncident }) {
  const r1 = useRef(), r2 = useRef(), r3 = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (r1.current) r1.current.rotation.z = t * 0.4;
    if (r2.current) r2.current.rotation.z = -t * 0.26;
    if (r3.current) r3.current.rotation.z = t * 0.18;
  });

  const color = hasIncident ? "#F87171" : "#A855F7";

  return (
    <>
      <mesh ref={r1} position={[0, -1.9, 0.0]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[2.1, 0.012, 6, 90]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.70} transparent opacity={0.55} />
      </mesh>
      <mesh ref={r2} position={[0, -1.9, 0.0]} rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[2.4, 0.009, 6, 90]} />
        <meshStandardMaterial color="#C084FC" emissive="#C084FC" emissiveIntensity={0.50} transparent opacity={0.38} />
      </mesh>
      <mesh ref={r3} position={[0, -1.9, 0.0]} rotation={[Math.PI / 2.6, -0.2, 0]}>
        <torusGeometry args={[2.7, 0.007, 6, 90]} />
        <meshStandardMaterial color="#E9D5FF" emissive="#E9D5FF" emissiveIntensity={0.35} transparent opacity={0.25} />
      </mesh>
    </>
  );
}

/* ─── Floating particles ─────────────────────────────────────── */
function Particles({ hasIncident }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 56; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 2.0 + Math.random() * 1.8;
      arr.push({
        x: Math.cos(theta) * r,
        y: (Math.random() - 0.5) * 4.5,
        z: (Math.sin(theta) * r * 0.4),
        speed: 0.3 + Math.random() * 0.6,
        offset: Math.random() * Math.PI * 2,
        orbitR: r,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    positions.forEach((p, i) => {
      const angle = t * p.speed * 0.4 + p.offset;
      dummy.position.set(
        Math.cos(angle) * p.orbitR,
        p.y + Math.sin(t * 0.5 + p.offset) * 0.15,
        Math.sin(angle) * p.orbitR * 0.35
      );
      dummy.scale.setScalar(0.8 + Math.sin(t * 2 + p.offset) * 0.2);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, 56]}>
      <sphereGeometry args={[0.025, 6, 6]} />
      <meshStandardMaterial
        color={hasIncident ? "#F87171" : "#C084FC"}
        emissive={hasIncident ? "#F87171" : "#C084FC"}
        emissiveIntensity={1.2}
      />
    </instancedMesh>
  );
}

/* ─── Scene wrapper ───────────────────────────────────────────── */
function LockScene({ hasIncident, dragOffset }) {
  const rootRef = useRef();

  useFrame(() => {
    if (!rootRef.current) return;
    // Apply drag-to-rotate offset and smoothly return when released
    rootRef.current.rotation.y += (dragOffset.current.y - rootRef.current.rotation.y) * 0.1;
    rootRef.current.rotation.x += (dragOffset.current.x - rootRef.current.rotation.x) * 0.1;
    if (!dragOffset.current.dragging) {
      dragOffset.current.x *= 0.92;
      dragOffset.current.y *= 0.92;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[3, 4, 4]}  color="#7C3AED" intensity={2.2} />
      <pointLight position={[-3, 2, -2]} color="#C084FC" intensity={1.6} />
      <pointLight position={[0, -4, 3]}  color="#2E1065" intensity={1.0} />
      <spotLight
        position={[0, 6, 4]}
        angle={0.4}
        penumbra={0.6}
        intensity={1.4}
        color="#E9D5FF"
        castShadow={false}
      />

      <Environment preset="night" />

      <group ref={rootRef}>
        <ShieldBody hasIncident={hasIncident} />
        <Shackle     hasIncident={hasIncident} />
        <Keyhole     hasIncident={hasIncident} />
        <CircuitLines hasIncident={hasIncident} />
      </group>
      <OrbitalRings hasIncident={hasIncident} />
      <Particles   hasIncident={hasIncident} />
    </>
  );
}

/* ─── WebGL fallback ─────────────────────────────────────────── */
function FallbackLock({ hasIncident }) {
  return (
    <div className="h-72 flex items-center justify-center">
      <div className="relative w-32 h-36 flex items-center justify-center">
        <div className={`w-28 h-32 rounded-b-[50%] rounded-t-lg border-4 ${hasIncident ? "border-red-500" : "border-purple-500"} flex items-center justify-center`}
             style={{ background: "linear-gradient(135deg, #160D26, #2E1065)" }}>
          <div className={`text-5xl ${hasIncident ? "text-red-400" : "text-purple-300"}`}>🔒</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Public component ────────────────────────────────────────── */
export default function SecurityLock3D({ hasIncident = false }) {
  const dragOffset = useRef({ x: 0, y: 0, dragging: false, lastX: 0, lastY: 0 });
  const [dragging, setDragging] = useState(false);

  const webglOK = useMemo(() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { return false; }
  }, []);

  if (!webglOK) return <FallbackLock hasIncident={hasIncident} />;

  return (
    <div
      style={{ height: "300px", width: "100%", position: "relative", cursor: dragging ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        dragOffset.current.dragging = true;
        dragOffset.current.lastX = e.clientX;
        dragOffset.current.lastY = e.clientY;
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!dragOffset.current.dragging) return;
        const dx = e.clientX - dragOffset.current.lastX;
        const dy = e.clientY - dragOffset.current.lastY;
        dragOffset.current.lastX = e.clientX;
        dragOffset.current.lastY = e.clientY;
        dragOffset.current.y = Math.max(-1.2, Math.min(1.2, dragOffset.current.y + dx * 0.008));
        dragOffset.current.x = Math.max(-0.6, Math.min(0.6, dragOffset.current.x + dy * 0.006));
      }}
      onPointerUp={() => {
        dragOffset.current.dragging = false;
        setDragging(false);
      }}
      onPointerLeave={() => {
        dragOffset.current.dragging = false;
        setDragging(false);
      }}
      title="Drag to rotate 3D Security Lock"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 5.8], fov: 40 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <LockScene hasIncident={hasIncident} dragOffset={dragOffset} />
        </Suspense>
      </Canvas>
    </div>
  );
}
