import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

/* ─── 3D -> 2D Screen-Space Label Projector (Zero React Roots) ─ */
function LabelProjector({ items, labelRefs }) {
  const { camera, size } = useThree();
  const vec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    items.forEach(({ id, pos }) => {
      const el = labelRefs.current[id];
      if (!el) return;
      vec.set(pos[0], pos[1], pos[2]).project(camera);
      if (vec.z > 1) {
        el.style.opacity = "0";
        return;
      }
      const x = (vec.x * 0.5 + 0.5) * size.width;
      const y = (-vec.y * 0.5 + 0.5) * size.height;
      el.style.opacity = "1";
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    });
  });

  return null;
}

/* ─── JARVIS-Inspired Central Intelligence Core ──────────────── */
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
      sphereRef.current.scale.setScalar(1 + Math.sin(t * 2.1) * 0.05);
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
    <group position={[0, 0.2, 0]}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.38, 28, 28]} />
        <meshStandardMaterial
          color="#FFE3A5"
          emissive="#E8BB65"
          emissiveIntensity={0.95}
          metalness={0.35}
          roughness={0.2}
        />
      </mesh>
      <group ref={arcRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.03, 10, 48, Math.PI * 1.35]} />
          <meshStandardMaterial color="#E8BB65" emissive="#B88635" emissiveIntensity={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI]}>
          <torusGeometry args={[0.72, 0.022, 10, 48, Math.PI * 0.85]} />
          <meshStandardMaterial color="#A855F7" emissive="#7C3AED" emissiveIntensity={0.55} />
        </mesh>
      </group>
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0.2, 0]}>
        <torusGeometry args={[0.98, 0.018, 10, 64]} />
        <meshStandardMaterial color="#C084FC" emissive="#7C3AED" emissiveIntensity={0.45} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.14, 0.016, 10, 64]} />
        <meshStandardMaterial color="#E8BB65" emissive="#B88635" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.28, 0.012, 8, 72]} />
        <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.4} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/* ─── Layered Holographic Gateway Shield ─────────────────────── */
function GatewayStructure({ reducedMotion }) {
  const ringRef = useRef();
  useFrame((_, delta) => {
    if (!reducedMotion && ringRef.current) ringRef.current.rotation.z += delta * 0.45;
  });

  return (
    <group position={[0, 0.05, 2.75]}>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.58, 24]} />
        <meshBasicMaterial color="#2E1065" transparent opacity={0.32} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <torusGeometry args={[0.6, 0.018, 8, 48]} />
        <meshStandardMaterial color="#E8BB65" emissive="#B88635" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.36, 0.24, 0.48, 6]} />
        <meshStandardMaterial
          color="#7C3AED"
          emissive="#A855F7"
          emissiveIntensity={0.45}
          metalness={0.3}
          roughness={0.35}
          transparent
          opacity={0.85}
        />
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
      mesh.position.z = 2.75 - progress * 2.75;
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
          <mesh key={i} position={[0, 0.14, 2.75 - (i / count) * 2.75]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={isRestricted ? STATE_COLORS.suspicious : "#E8BB65"} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ─── Recognizable Holographic Workstation / Server Endpoint ─── */
function EndpointNode({ ep, pos, color, isSelected, isHovered, dimmed, onHover, onSelect }) {
  const isIsolated = ep.status === "simulated_isolated";
  const isServer = ep.endpoint_id.startsWith("BAK");
  const nodeScale = isHovered ? 1.18 : isSelected ? 1.08 : 1.0;
  const accentColor = isIsolated ? STATE_COLORS.contained : isHovered || isSelected ? "#E8BB65" : color;

  return (
    <group>
      <Line
        points={[[0, 0.2, 0], pos]}
        color={isIsolated ? STATE_COLORS.contained : isHovered || isSelected ? "#E8BB65" : "#7C3AED"}
        lineWidth={isHovered || isSelected || isIsolated ? 2.6 : 1.2}
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
        <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.48, 24]} />
          <meshBasicMaterial color="#2E1065" transparent opacity={dimmed ? 0.1 : 0.28} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.49, 0.015, 8, 32]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isHovered || isSelected ? 0.9 : 0.55}
            transparent
            opacity={dimmed ? 0.25 : 0.95}
          />
        </mesh>

        {isIsolated && (
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.66, 0.022, 8, 36]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.9} />
          </mesh>
        )}

        {isServer ? (
          /* Backup Server Rack Silhouette */
          <group>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.38, 0.5, 0.3]} />
              <meshStandardMaterial color="#7C3AED" emissive="#2E1065" emissiveIntensity={0.45} metalness={0.25} roughness={0.4} transparent opacity={dimmed ? 0.35 : 0.9} />
            </mesh>
            {[0.22, 0.08, -0.06].map((yPos, idx) => (
              <mesh key={idx} position={[0, yPos, 0.16]}>
                <boxGeometry args={[0.28, 0.04, 0.02]} />
                <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.75} />
              </mesh>
            ))}
          </group>
        ) : (
          /* Workstation Silhouette (Monitor + Base + Tower) */
          <group>
            <mesh position={[-0.18, 0.02, 0]}>
              <boxGeometry args={[0.14, 0.34, 0.24]} />
              <meshStandardMaterial color="#7C3AED" emissive="#2E1065" emissiveIntensity={0.45} metalness={0.25} roughness={0.4} transparent opacity={dimmed ? 0.35 : 0.9} />
            </mesh>
            <mesh position={[0.1, 0.1, -0.02]}>
              <boxGeometry args={[0.34, 0.22, 0.03]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={isHovered ? 0.9 : 0.45} transparent opacity={dimmed ? 0.35 : 0.95} />
            </mesh>
            <mesh position={[0.1, -0.12, 0.08]}>
              <boxGeometry args={[0.28, 0.03, 0.14]} />
              <meshStandardMaterial color="#A855F7" emissive="#2E1065" emissiveIntensity={0.35} transparent opacity={dimmed ? 0.35 : 0.9} />
            </mesh>
          </group>
        )}
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
  const labelRefs = useRef({});

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
    const coords = [
      [-3.3, 0.1, -0.6],
      [-2.0, 0.1, -2.2],
      [0.0, 0.1, -2.65],
      [2.0, 0.1, -2.2],
      [3.3, 0.1, -0.6],
    ];
    return endpoints.slice(0, 5).map((ep, idx) => ({
      ep,
      pos: coords[idx] || [0, 0.1, -2],
    }));
  }, [endpoints]);

  const labelItems = useMemo(
    () => [
      { id: "__core__", pos: [0, 1.35, 0] },
      { id: "__gw__", pos: [0, 0.65, 2.75] },
      ...nodePositions.map(({ ep, pos }) => ({
        id: ep.endpoint_id,
        pos: [pos[0], pos[1] + 0.52, pos[2]],
      })),
    ],
    [nodePositions]
  );

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
    <div className="h-80 sm:h-[410px] w-full bg-[#160D26]/10 backdrop-blur-[5px] border border-purple-300/10 rounded-xl overflow-hidden relative">
      <button
        type="button"
        onClick={() => controlsRef.current?.reset()}
        className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded bg-[#160D26]/70 hover:bg-[#29193E]/85 border border-[#E8BB65]/35 text-[10px] font-mono text-[#FFE3A5] transition"
      >
        Reset View
      </button>

      {/* Projected 3D-Anchored HTML Labels (Zero Nested React Roots) */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <div
          ref={(el) => (labelRefs.current.__core__ = el)}
          className="absolute top-0 left-0 px-2 py-0.5 rounded bg-[#160D26]/80 border border-[#E8BB65]/45 text-[10px] font-mono text-[#FFE3A5] whitespace-nowrap"
        >
          SENTINEL CORE
        </div>
        <div
          ref={(el) => (labelRefs.current.__gw__ = el)}
          className="absolute top-0 left-0 px-2 py-0.5 rounded bg-[#160D26]/80 border border-purple-300/25 text-[10px] font-mono text-[#E9D5FF] whitespace-nowrap"
        >
          GATEWAY ({gateway?.queue_depth ?? 0}/{gateway?.queue_capacity ?? 10})
        </div>
        {nodePositions.map(({ ep }) => {
          const isSelected = ep.endpoint_id === selectedEndpointId;
          const isHovered = ep.endpoint_id === hoveredEndpointId;
          const isIsolated = ep.status === "simulated_isolated";
          return (
            <button
              key={ep.endpoint_id}
              ref={(el) => (labelRefs.current[ep.endpoint_id] = el)}
              type="button"
              onMouseEnter={() => setHoveredEndpointId(ep.endpoint_id)}
              onMouseLeave={() => setHoveredEndpointId(null)}
              onClick={() => onSelectEndpoint(ep.endpoint_id)}
              className={`pointer-events-auto absolute top-0 left-0 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border transition-colors ${
                isIsolated
                  ? "bg-rose-950/90 border-rose-500 text-rose-200"
                  : isHovered || isSelected
                  ? "bg-[#29193E]/95 border-[#E8BB65] text-[#FFE3A5] shadow-[0_0_12px_rgba(232,187,101,0.35)]"
                  : "bg-[#160D26]/80 border-purple-300/20 text-[#F3E8FF]"
              }`}
            >
              {ep.endpoint_id} · {ep.current_risk_score ?? 0} · {ep.status}
            </button>
          );
        })}
      </div>

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 5.2, 8.2], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#C084FC", "#29193E", 0.9]} />
        <directionalLight position={[4, 8, 5]} intensity={1.6} color="#F3E8FF" />
        <pointLight position={[5, 6, 5]} intensity={1.2} color="#A855F7" />
        <pointLight position={[-5, 4, -5]} intensity={0.9} color="#E8BB65" />

        <gridHelper args={[12, 16, "#7C3AED", "#29193E"]} position={[0, -0.25, 0]} material-transparent material-opacity={0.14} />

        <LabelProjector items={labelItems} labelRefs={labelRefs} />
        <ProtectionCore hasIncident={hasIncident} reducedMotion={reducedMotion} />
        <GatewayStructure reducedMotion={reducedMotion} />

        <Line points={[[0, 0.05, 2.75], [0, 0.2, 0]]} color="#A855F7" lineWidth={1.6} />
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
          minDistance={5.5}
          maxDistance={13}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.25}
        />
      </Canvas>
    </div>
  );
}
