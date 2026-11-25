import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";

const STATE_COLORS = {
  normal: "#10b981",
  monitoring: "#E8BB65",
  warning: "#f59e0b",
  suspicious: "#f43f5e",
  contained: "#f43f5e",
  inactive: "#64748b",
};

function resolveEndpointColor(ep, replayIncident, replayStep) {
  if (!ep) return STATE_COLORS.inactive;
  if (replayIncident && replayIncident.endpoint_id === ep.endpoint_id) {
    const score = replayIncident.risk_score ?? 0;
    if (replayStep >= 3 || ep.status === "simulated_isolated") return STATE_COLORS.contained;
    if (score >= 50) return STATE_COLORS.suspicious;
    return STATE_COLORS.warning;
  }
  if (ep.status === "simulated_isolated") return STATE_COLORS.contained;
  if (ep.status === "paused") return STATE_COLORS.inactive;
  const score = ep.current_risk_score ?? 0;
  if (score >= 50) return STATE_COLORS.suspicious;
  if (score >= 25) return STATE_COLORS.warning;
  return STATE_COLORS.monitoring;
}

/* ─── JARVIS-Inspired Mechanical Intelligence Core ───────────── */
function ProtectionCore({ hasIncident, reducedMotion }) {
  const sphereRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();
  const arcRef = useRef();

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    const speed = hasIncident ? 0.65 : 0.35;
    if (sphereRef.current) {
      const s = 1 + Math.sin(t * 2.1) * 0.05;
      sphereRef.current.scale.setScalar(s);
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * speed * 0.9;
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * speed * 0.7;
      ring2Ref.current.rotation.x += delta * speed * 0.25;
    }
    if (ring3Ref.current) ring3Ref.current.rotation.z -= delta * speed * 0.5;
    if (arcRef.current) arcRef.current.rotation.y += delta * speed * 1.1;
  });

  return (
    <group position={[0, 0.15, 0]}>
      {/* Luminous Golden Central Sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.38, 28, 28]} />
        <meshStandardMaterial
          color="#FFE3A5"
          emissive="#E8BB65"
          emissiveIntensity={0.95}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Purple Energy Cage */}
      <mesh>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial
          color="#A855F7"
          wireframe
          emissive="#7C3AED"
          emissiveIntensity={0.45}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Segmented Mechanical Arcs */}
      <group ref={arcRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.88, 0.032, 10, 48, Math.PI * 1.35]} />
          <meshStandardMaterial color="#E8BB65" emissive="#B88635" emissiveIntensity={0.55} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI]}>
          <torusGeometry args={[0.88, 0.022, 10, 48, Math.PI * 0.85]} />
          <meshStandardMaterial color="#A855F7" emissive="#7C3AED" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Independently Rotating Orbital Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0.2, 0]}>
        <torusGeometry args={[1.08, 0.018, 10, 64]} />
        <meshStandardMaterial color="#C084FC" emissive="#7C3AED" emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.24, 0.016, 10, 64]} />
        <meshStandardMaterial color="#E8BB65" emissive="#B88635" emissiveIntensity={0.45} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.38, 0.01, 8, 72]} />
        <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.35} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

/* ─── Holographic Gateway Shield Structure ───────────────────── */
function GatewayStructure({ gateway, reducedMotion }) {
  const ringRef = useRef();
  useFrame((_, delta) => {
    if (!reducedMotion && ringRef.current) {
      ringRef.current.rotation.z += delta * 0.45;
    }
  });

  return (
    <group position={[0, 0.05, 3.15]}>
      {/* Base Platform */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.06, 8]} />
        <meshStandardMaterial color="#29193E" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Shield Core */}
      <mesh position={[0, 0.08, 0]}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial
          color="#7C3AED"
          emissive="#A855F7"
          emissiveIntensity={0.45}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      {/* Rotating Gold Perimeter Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <torusGeometry args={[0.66, 0.018, 8, 48]} />
        <meshStandardMaterial color="#E8BB65" emissive="#B88635" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ─── Directional Particles (Recorded Synthetic Events Only) ── */
function GatewayFlowParticles({ gateway, reducedMotion }) {
  const recorded = (gateway?.accepted_requests || 0) + (gateway?.avoided_assessments || 0);
  const count = recorded > 0 ? Math.min(10, Math.max(2, recorded)) : 0;
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current || count === 0) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((mesh, idx) => {
      const progress = (t * 0.45 + idx / count) % 1;
      mesh.position.z = 3.15 - progress * 3.15;
      mesh.position.x = Math.sin(progress * Math.PI * 2 + idx) * 0.08;
    });
  });

  if (count === 0) return null;

  const restrictedRatio = gateway?.total_requests
    ? (gateway.throttled_requests + gateway.rejected_requests) / gateway.total_requests
    : 0;

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => {
        const isRestricted = i / count < restrictedRatio;
        return (
          <mesh key={i} position={[0, 0.12, 3.15 - (i / count) * 3.15]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={isRestricted ? STATE_COLORS.suspicious : "#E8BB65"} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ─── Detailed Holographic Workstation / Server Endpoint ─────── */
function EndpointNode({
  ep,
  pos,
  color,
  isSelected,
  isHovered,
  dimmed,
  onHover,
  onSelect,
}) {
  const isIsolated = ep.status === "simulated_isolated";
  const nodeScale = isHovered ? 1.2 : isSelected ? 1.08 : 1.0;
  const accentColor = isIsolated ? STATE_COLORS.contained : isHovered || isSelected ? "#E8BB65" : color;

  return (
    <group>
      <Line
        points={[[0, 0.15, 0], pos]}
        color={isIsolated ? STATE_COLORS.contained : isHovered || isSelected ? "#E8BB65" : "#7C3AED"}
        lineWidth={isHovered || isSelected || isIsolated ? 2.6 : 1.1}
        transparent
        opacity={dimmed ? 0.18 : 0.9}
      />

      <group
        position={pos}
        scale={nodeScale}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(ep.endpoint_id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(ep.endpoint_id);
        }}
      >
        {/* Circular Holographic Platform */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.44, 0.48, 0.04, 24]} />
          <meshStandardMaterial
            color="#160D26"
            metalness={0.75}
            roughness={0.25}
            transparent
            opacity={dimmed ? 0.3 : 0.9}
          />
        </mesh>
        {/* Champagne-Gold Platform Outline Ring */}
        <mesh position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.015, 8, 32]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isHovered || isSelected ? 0.8 : 0.4}
            transparent
            opacity={dimmed ? 0.25 : 0.95}
          />
        </mesh>

        {/* Localized Containment Isolation Boundary */}
        {isIsolated && (
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.62, 0.02, 8, 36]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.85} />
          </mesh>
        )}

        {/* Workstation / Server Chassis */}
        <mesh position={[-0.12, 0.02, 0]}>
          <boxGeometry args={[0.18, 0.36, 0.26]} />
          <meshStandardMaterial
            color="#29193E"
            metalness={0.65}
            roughness={0.3}
            transparent
            opacity={dimmed ? 0.35 : 1}
          />
        </mesh>
        {/* Holographic Monitor Screen */}
        <mesh position={[0.12, 0.06, 0]} rotation={[0, -0.25, 0]}>
          <boxGeometry args={[0.26, 0.2, 0.03]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isHovered ? 0.85 : isSelected ? 0.6 : 0.32}
            transparent
            opacity={dimmed ? 0.35 : 0.95}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function SecurityTopology3D({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  gateway,
  replayIncident,
  replayStep,
  lowPerfMode,
}) {
  const [webglOk, setWebglOk] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hoveredEndpointId, setHoveredEndpointId] = useState(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq) setReducedMotion(mq.matches);
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  const nodePositions = useMemo(() => {
    const radius = 2.6;
    const angles = [-Math.PI * 0.85, -Math.PI * 0.5, -Math.PI * 0.15, Math.PI * 0.18, Math.PI * 0.82];
    return endpoints.slice(0, 5).map((ep, idx) => {
      const a = angles[idx] ?? (idx / 5) * Math.PI * 2;
      return {
        ep,
        pos: [
          Number((Math.cos(a) * radius).toFixed(2)),
          0.1,
          Number((Math.sin(a) * radius - 0.3).toFixed(2)),
        ],
      };
    });
  }, [endpoints]);

  const hasIncident = endpoints.some((e) => e.status === "simulated_isolated");

  if (!webglOk || lowPerfMode) {
    return (
      <div className="p-4 bg-[#160D26]/12 backdrop-blur-[5px] border border-purple-300/10 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#E8BB65] uppercase tracking-wider">
            2D Topology Fallback ({!webglOk ? "WebGL Unavailable" : "Low-Performance Mode"})
          </span>
          <span className="font-mono text-[#AD98C5]">
            GW: {gateway?.accepted_requests ?? 0} accepted / {gateway?.avoided_assessments ?? 0} avoided
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {endpoints.map((ep) => {
            const color = resolveEndpointColor(ep, replayIncident, replayStep);
            const isSelected = ep.endpoint_id === selectedEndpointId;
            return (
              <button
                key={ep.endpoint_id}
                onClick={() => onSelectEndpoint(ep.endpoint_id)}
                style={{ borderColor: isSelected ? "#E8BB65" : color }}
                className="p-2.5 bg-[#160D26]/20 rounded-lg border text-left text-xs font-mono hover:bg-[#29193E]/35 transition"
              >
                <div className="font-bold text-[#F3E8FF]">{ep.endpoint_id}</div>
                <div className="text-[10px] text-[#AD98C5]">{ep.department}</div>
                <div className="text-[10px] mt-1" style={{ color }}>
                  {ep.status} ({ep.current_risk_score ?? 0})
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 sm:h-96 w-full bg-[#160D26]/10 backdrop-blur-[5px] border border-purple-300/10 rounded-xl overflow-hidden relative">
      <button
        type="button"
        onClick={() => controlsRef.current?.reset()}
        className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded bg-[#160D26]/60 hover:bg-[#29193E]/80 border border-[#E8BB65]/35 text-[10px] font-mono text-[#FFE3A5] transition"
      >
        Reset View
      </button>

      {/* Safe React HUD Overlay (replaces drei <Html> to prevent React 19 root.unmount race) */}
      <div className="absolute bottom-2.5 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-[#160D26]/75 border border-purple-300/20 text-[10px] font-mono text-[#E9D5FF]">
          CORE · GATEWAY ({gateway?.queue_depth ?? 0}/{gateway?.queue_capacity ?? 10})
        </span>
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {endpoints.slice(0, 5).map((ep) => {
            const isSelected = ep.endpoint_id === selectedEndpointId;
            const isHovered = ep.endpoint_id === hoveredEndpointId;
            const isIsolated = ep.status === "simulated_isolated";
            return (
              <button
                key={ep.endpoint_id}
                type="button"
                onMouseEnter={() => setHoveredEndpointId(ep.endpoint_id)}
                onMouseLeave={() => setHoveredEndpointId(null)}
                onClick={() => onSelectEndpoint(ep.endpoint_id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                  isIsolated
                    ? "bg-rose-950/85 border-rose-500 text-rose-200"
                    : isHovered || isSelected
                    ? "bg-[#29193E]/90 border-[#E8BB65] text-[#FFE3A5]"
                    : "bg-[#160D26]/75 border-purple-300/20 text-[#F3E8FF]"
                }`}
              >
                {ep.endpoint_id} ({ep.current_risk_score ?? 0})
              </button>
            );
          })}
        </div>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 5.4, 7.6], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 6, 5]} intensity={1.25} color="#A855F7" />
        <pointLight position={[-5, 4, -5]} intensity={0.8} color="#E8BB65" />

        {/* Subtle Spatial Grid */}
        <gridHelper args={[12, 16, "#7C3AED", "#29193E"]} position={[0, -0.25, 0]} />

        <ProtectionCore hasIncident={hasIncident} reducedMotion={reducedMotion} />
        <GatewayStructure gateway={gateway} reducedMotion={reducedMotion} />

        <Line points={[[0, 0.05, 3.15], [0, 0.15, 0]]} color="#A855F7" lineWidth={1.6} />
        <GatewayFlowParticles gateway={gateway} reducedMotion={reducedMotion} />

        {nodePositions.map(({ ep, pos }) => {
          const color = resolveEndpointColor(ep, replayIncident, replayStep);
          const isSelected = ep.endpoint_id === selectedEndpointId;
          const isHovered = ep.endpoint_id === hoveredEndpointId;
          const dimmed = Boolean(hoveredEndpointId && !isHovered);
          return (
            <EndpointNode
              key={ep.endpoint_id}
              ep={ep}
              pos={pos}
              color={color}
              isSelected={isSelected}
              isHovered={isHovered}
              dimmed={dimmed}
              onHover={setHoveredEndpointId}
              onSelect={onSelectEndpoint}
            />
          );
        })}

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={5.2}
          maxDistance={12}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
