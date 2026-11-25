import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";

const STATE_COLORS = {
  normal: "#10b981",
  monitoring: "#E8BB65",
  warning: "#f59e0b",
  suspicious: "#f43f5e",
  contained: "#7C3AED",
  inactive: "#64748b"
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
  return ep.last_activity && ep.last_activity !== "Monitoring active"
    ? STATE_COLORS.normal
    : STATE_COLORS.monitoring;
}

function ProtectionCore({ hasIncident, reducedMotion }) {
  const coreRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const color = hasIncident ? STATE_COLORS.suspicious : STATE_COLORS.monitoring;

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const speed = hasIncident ? 0.9 : 0.35;
    if (coreRef.current) coreRef.current.rotation.y += delta * speed;
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * speed * 0.7;
    if (ring2Ref.current) ring2Ref.current.rotation.x -= delta * speed * 0.5;
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.1, 0.025, 12, 48]} />
        <meshStandardMaterial color="#C084FC" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.3, 0.02, 12, 48]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <Html position={[0, 1.55, 0]} center distanceFactor={10}>
        <div className="px-2 py-0.5 rounded bg-[#10091C]/90 border border-purple-500/50 text-[10px] font-mono text-[#E9D5FF] whitespace-nowrap pointer-events-none">
          AI CORE
        </div>
      </Html>
    </group>
  );
}

function GatewayFlowParticles({ gateway, reducedMotion }) {
  const count = Math.min(12, Math.max(2, (gateway?.accepted_requests || 0) + (gateway?.avoided_assessments || 0)));
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((mesh, idx) => {
      const progress = ((t * 0.45 + idx / count) % 1);
      // Flow from z=5.2 -> Gateway (z=3.0) -> AI Core (z=0.0)
      mesh.position.z = 5.2 - progress * 5.2;
      mesh.position.x = Math.sin(progress * Math.PI * 2 + idx) * 0.12;
    });
  });

  const restrictedRatio = gateway?.total_requests
    ? (gateway.throttled_requests + gateway.rejected_requests) / gateway.total_requests
    : 0;

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => {
        const isRestricted = i / count < restrictedRatio;
        return (
          <mesh key={i} position={[0, 0.1, 5.2 - (i / count) * 5.2]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={isRestricted ? STATE_COLORS.suspicious : "#E8BB65"} />
          </mesh>
        );
      })}
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
  lowPerfMode
}) {
  const [webglOk, setWebglOk] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hoveredEndpointId, setHoveredEndpointId] = useState(null);

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
    // Distribute all 5 endpoints evenly in a balanced arc/ring around the central AI Core
    const radius = 2.55;
    const angles = [-Math.PI * 0.85, -Math.PI * 0.5, -Math.PI * 0.15, Math.PI * 0.18, Math.PI * 0.82];
    return endpoints.slice(0, 5).map((ep, idx) => {
      const a = angles[idx] ?? (idx / 5) * Math.PI * 2;
      return {
        ep,
        pos: [
          Number((Math.cos(a) * radius).toFixed(2)),
          0.15,
          Number((Math.sin(a) * radius - 0.35).toFixed(2))
        ]
      };
    });
  }, [endpoints]);

  const hasIncident = endpoints.some((e) => e.status === "simulated_isolated");

  if (!webglOk || lowPerfMode) {
    return (
      <div className="p-4 bg-[#08050F]/90 border border-purple-900/50 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#C084FC] uppercase tracking-wider">
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
                style={{ borderColor: isSelected ? "#C084FC" : color }}
                className="p-2.5 bg-[#10091C] rounded-lg border text-left text-xs font-mono hover:bg-[#211334] transition"
              >
                <div className="font-bold text-[#F5EDFF]">{ep.endpoint_id}</div>
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
    <div className="h-80 sm:h-96 w-full bg-[#10091C]/35 backdrop-blur-sm border border-purple-900/50 rounded-xl overflow-hidden relative">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 5.4, 7.6], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <ambientLight intensity={0.65} />
        <pointLight position={[5, 6, 5]} intensity={1.2} color="#A855F7" />
        <pointLight position={[-5, 4, -5]} intensity={0.7} color="#7C3AED" />

        <ProtectionCore hasIncident={hasIncident} reducedMotion={reducedMotion} />

        {/* Gateway Node */}
        <group position={[0, 0, 3.1]}>
          <mesh>
            <boxGeometry args={[0.8, 0.45, 0.5]} />
            <meshStandardMaterial color="#7C3AED" metalness={0.5} roughness={0.35} />
          </mesh>
          <Html position={[0, 0.62, 0]} center distanceFactor={11}>
            <div className="px-2 py-0.5 rounded bg-[#10091C]/90 border border-purple-700/60 text-[10px] font-mono text-[#E9D5FF] whitespace-nowrap pointer-events-none">
              GATEWAY ({gateway?.queue_depth ?? 0}/{gateway?.queue_capacity ?? 10})
            </div>
          </Html>
        </group>

        <Line points={[[0, 0, 3.1], [0, 0, 0]]} color="#A855F7" lineWidth={1.5} />
        <GatewayFlowParticles gateway={gateway} reducedMotion={reducedMotion} />

        {/* 5 Virtual Department Workstations */}
        {nodePositions.map(({ ep, pos }) => {
          const color = resolveEndpointColor(ep, replayIncident, replayStep);
          const isSelected = ep.endpoint_id === selectedEndpointId;
          const isHovered = ep.endpoint_id === hoveredEndpointId;
          const dimmed = hoveredEndpointId && !isHovered;
          const nodeScale = isHovered ? 1.24 : isSelected ? 1.1 : 1.0;
          return (
            <group key={ep.endpoint_id}>
              <Line
                points={[[0, 0, 0], pos]}
                color={isHovered || isSelected ? "#E8BB65" : color}
                lineWidth={isHovered || isSelected ? 2.8 : 1}
                transparent
                opacity={dimmed ? 0.2 : 0.92}
              />
              <mesh
                position={pos}
                scale={nodeScale}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredEndpointId(ep.endpoint_id);
                }}
                onPointerOut={() => setHoveredEndpointId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEndpoint(ep.endpoint_id);
                }}
              >
                <boxGeometry args={[0.55, 0.45, 0.55]} />
                <meshStandardMaterial
                  color={isHovered || isSelected ? "#E8BB65" : color}
                  emissive={isHovered || isSelected ? "#E8BB65" : color}
                  emissiveIntensity={isHovered ? 0.85 : isSelected ? 0.55 : 0.18}
                  transparent
                  opacity={dimmed ? 0.28 : 1}
                />
              </mesh>
              <Html position={[pos[0], pos[1] + 0.65, pos[2]]} center distanceFactor={11}>
                <button
                  onMouseEnter={() => setHoveredEndpointId(ep.endpoint_id)}
                  onMouseLeave={() => setHoveredEndpointId(null)}
                  onClick={() => onSelectEndpoint(ep.endpoint_id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border transition-all duration-200 ${
                    dimmed ? "opacity-30" : "opacity-100"
                  } ${
                    isHovered || isSelected
                      ? "bg-[#29193E] border-[#E8BB65] text-[#FFE3A5] shadow-[0_0_12px_rgba(232,187,101,0.35)]"
                      : "bg-[#10091C]/90 border-purple-800/60 text-[#AD98C5]"
                  }`}
                >
                  {ep.endpoint_id} ({ep.current_risk_score ?? 0})
                  {isHovered && ` • ${ep.department}`}
                </button>
              </Html>
            </group>
          );
        })}

        <OrbitControls enablePan={false} minDistance={5.5} maxDistance={12} minPolarAngle={0.35} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
}

