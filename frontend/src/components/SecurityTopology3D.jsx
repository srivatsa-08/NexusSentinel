import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";

const STATE_COLORS = {
  normal: "#10b981",
  monitoring: "#22d3ee",
  warning: "#f59e0b",
  suspicious: "#f43f5e",
  contained: "#a855f7",
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
        <meshStandardMaterial color="#38bdf8" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.3, 0.02, 12, 48]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <Html position={[0, 1.55, 0]} center distanceFactor={10}>
        <div className="px-2 py-0.5 rounded bg-slate-950/90 border border-cyan-800/60 text-[10px] font-mono text-cyan-300 whitespace-nowrap pointer-events-none">
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
            <meshBasicMaterial color={isRestricted ? STATE_COLORS.suspicious : STATE_COLORS.monitoring} />
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
      [-3.2, 0.2, -1.5],
      [-1.8, 0.2, -3.0],
      [0.0, 0.2, -3.5],
      [1.8, 0.2, -3.0],
      [3.2, 0.2, -1.5]
    ];
    return endpoints.slice(0, 5).map((ep, idx) => ({
      ep,
      pos: coords[idx] || [0, 0, -2]
    }));
  }, [endpoints]);

  const hasIncident = endpoints.some((e) => e.status === "simulated_isolated");

  if (!webglOk || lowPerfMode) {
    return (
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-cyan-300 uppercase tracking-wider">
            2D Topology Fallback ({!webglOk ? "WebGL Unavailable" : "Low-Performance Mode"})
          </span>
          <span className="font-mono text-slate-400">
            GW: {gateway?.accepted_requests ?? 0} accepted / {gateway?.avoided_assessments ?? 0} avoided
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {endpoints.map((ep) => {
            const color = resolveEndpointColor(ep, replayIncident, replayStep);
            return (
              <button
                key={ep.endpoint_id}
                onClick={() => onSelectEndpoint(ep.endpoint_id)}
                style={{ borderColor: color }}
                className="p-2.5 bg-slate-900 rounded border text-left text-xs font-mono hover:bg-slate-800 transition"
              >
                <div className="font-bold text-slate-100">{ep.endpoint_id}</div>
                <div className="text-[10px] text-slate-400">{ep.department}</div>
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
    <div className="h-72 w-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 4.2, 7.2], fov: 45 }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 6, 5]} intensity={1.1} color="#38bdf8" />
        <pointLight position={[-5, 4, -5]} intensity={0.6} color="#0ea5e9" />

        <ProtectionCore hasIncident={hasIncident} reducedMotion={reducedMotion} />

        {/* Gateway Node */}
        <group position={[0, 0, 3.0]}>
          <mesh>
            <boxGeometry args={[0.8, 0.45, 0.5]} />
            <meshStandardMaterial color="#0284c7" metalness={0.4} roughness={0.4} />
          </mesh>
          <Html position={[0, 0.55, 0]} center distanceFactor={10}>
            <div className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-slate-200 whitespace-nowrap pointer-events-none">
              GATEWAY ({gateway?.queue_depth ?? 0}/{gateway?.queue_capacity ?? 10})
            </div>
          </Html>
        </group>

        <Line points={[[0, 0, 3.0], [0, 0, 0]]} color="#0ea5e9" lineWidth={1.5} />
        <GatewayFlowParticles gateway={gateway} reducedMotion={reducedMotion} />

        {/* 5 Virtual Department Workstations */}
        {nodePositions.map(({ ep, pos }) => {
          const color = resolveEndpointColor(ep, replayIncident, replayStep);
          const isSelected = ep.endpoint_id === selectedEndpointId;
          return (
            <group key={ep.endpoint_id}>
              <Line points={[[0, 0, 0], pos]} color={color} lineWidth={isSelected ? 2 : 1} />
              <mesh
                position={pos}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEndpoint(ep.endpoint_id);
                }}
              >
                <boxGeometry args={[0.55, 0.45, 0.55]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isSelected ? 0.5 : 0.15}
                />
              </mesh>
              <Html position={[pos[0], pos[1] + 0.55, pos[2]]} center distanceFactor={10}>
                <button
                  onClick={() => onSelectEndpoint(ep.endpoint_id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border ${
                    isSelected
                      ? "bg-slate-900 border-cyan-400 text-cyan-300"
                      : "bg-slate-950/90 border-slate-700 text-slate-200"
                  }`}
                >
                  {ep.endpoint_id} ({ep.current_risk_score ?? 0})
                </button>
              </Html>
            </group>
          );
        })}

        <OrbitControls enablePan={false} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
}

