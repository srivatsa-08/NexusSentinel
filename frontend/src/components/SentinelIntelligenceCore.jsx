import React, { useRef, useState, useEffect, useCallback } from "react";

const ENTRANCE_DURATION = 3.5; // seconds
const CYCLE_DURATION = 40.0;   // seconds
const EVENT_DURATION = 1.8;    // seconds

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const bell = (t) => Math.sin(clamp01(t) * Math.PI); // smooth 0 -> 1 -> 0

/**
 * SentinelIntelligenceCore
 * SVG-based JARVIS Confidential Core — Mechanical Density Expansion
 * with unified requestAnimationFrame 3.5s entrance + 40s periodic choreography:
 *   10s: Energy Propagation (inside -> outside golden pulse)
 *   20s: Gyroscopic Realignment (multi-axis tilt & return)
 *   30s: Mechanical Convergence (inward contraction & sequential expansion)
 *   40s: Orbital Synchronization (momentary alignment & illumination)
 */
const SentinelIntelligenceCore = React.memo(function SentinelIntelligenceCore({
  hasIncident = false,
  threatReactionNonce = 0,
  onInspect,
}) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const threatTimerRef = useRef(0);
  const layerRefs = useRef({
    core: null,
    l5: null,
    l4: null,
    l3a: null,
    l3b: null,
    l2: null,
    l1: null,
    hud: null,
  });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (threatReactionNonce > 0) {
      threatTimerRef.current = 3.5;
    }
  }, [threatReactionNonce]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let lastNow = 0;
    let elapsed = 0;

    const applyStatic = () => {
      const refs = layerRefs.current;
      Object.values(refs).forEach((el) => {
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "";
      });
    };

    const tick = (now) => {
      raf = 0;
      if (document.hidden || mq?.matches) {
        if (mq?.matches) applyStatic();
        lastNow = 0;
        return;
      }

      const dt = lastNow ? Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000)) : 1 / 60;
      lastNow = now;
      elapsed += dt;

      const refs = layerRefs.current;

      // ── 1. Initial Entrance (0 -> 3.5s, played once per mount) ──
      const inEntrance = elapsed < ENTRANCE_DURATION;
      const eCore = inEntrance ? easeOutCubic(elapsed / 0.65) : 1;
      const eL5 = inEntrance ? easeOutCubic((elapsed - 0.5) / 0.7) : 1;
      const eL4 = inEntrance ? easeOutCubic((elapsed - 1.0) / 0.8) : 1;
      const eL3 = inEntrance ? easeOutCubic((elapsed - 1.6) / 0.85) : 1;
      const eL2 = inEntrance ? easeOutCubic((elapsed - 2.2) / 0.8) : 1;
      const eL1 = inEntrance ? easeOutCubic((elapsed - 2.5) / 0.8) : 1;
      const eHud = inEntrance ? easeOutCubic((elapsed - 2.8) / 0.7) : 1;

      // ── 2. Periodic Special Movements (40s cycle after entrance) ──
      const cycleT = elapsed >= ENTRANCE_DURATION ? elapsed % CYCLE_DURATION : -1;
      const propT = cycleT >= 10 && cycleT < 10 + EVENT_DURATION ? (cycleT - 10) / EVENT_DURATION : -1;
      const gyroT = cycleT >= 20 && cycleT < 20 + EVENT_DURATION ? (cycleT - 20) / EVENT_DURATION : -1;
      const convT = cycleT >= 30 && cycleT < 30 + EVENT_DURATION ? (cycleT - 30) / EVENT_DURATION : -1;
      const syncT =
        elapsed >= CYCLE_DURATION && cycleT >= 0 && cycleT < EVENT_DURATION
          ? cycleT / EVENT_DURATION
          : -1;

      // Helper for Energy Propagation pulse per layer (0..1)
      const pulseAt = (offset) => (propT >= 0 ? bell((propT - offset) * 2.2) : 0);
      const syncBell = syncT >= 0 ? bell(syncT) : 0;
      const gyroBell = gyroT >= 0 ? bell(gyroT) : 0;
      const convBell = convT >= 0 ? bell(convT) : 0;
      let threatBurst = 0;
      if (threatTimerRef.current > 0) {
        threatTimerRef.current = Math.max(0, threatTimerRef.current - 0.016);
        const p = 1 - threatTimerRef.current / 3.5;
        if (p < 0.3) {
          threatBurst = easeOutCubic(p / 0.3);
        } else if (p < 0.65) {
          threatBurst = 1.0 - Math.sin(((p - 0.3) / 0.35) * Math.PI) * 0.06;
        } else {
          threatBurst = 1.0 - easeOutCubic((p - 0.65) / 0.35);
        }
      }

      // Idle rotations (deg)
      const r1 = (elapsed * 4) % 360;
      const r2 = (elapsed * 8.5) % 360;
      const r3a = (elapsed * 16) % 360;
      const r3b = (-elapsed * 13) % 360;
      const r4 = (-elapsed * 12) % 360;
      const r5 = (-elapsed * 18) % 360;

      // Synchronization pulls rotations smoothly toward 0 mod 360
      const syncBlend = (deg) => deg * (1 - syncBell * 0.85);

      if (refs.core) {
        const breath = 1 + Math.sin(elapsed * 2.1) * 0.04 + pulseAt(0.0) * 0.12 + syncBell * 0.08 + threatBurst * 0.18;
        refs.core.style.opacity = String(eCore);
        refs.core.style.transform = `scale(${( (0.35 + 0.65 * eCore) * breath ).toFixed(3)})`;
      }
      if (wrapRef.current) {
        wrapRef.current.style.filter =
          threatBurst > 0.01
            ? `hue-rotate(${(-48 * threatBurst).toFixed(1)}deg) saturate(${(1 + threatBurst * 0.9).toFixed(2)}) drop-shadow(0 0 ${(18 + threatBurst * 26).toFixed(1)}px rgba(244,63,94,${(0.4 + threatBurst * 0.5).toFixed(2)}))`
            : "";
        wrapRef.current.style.transform =
          threatBurst > 0.01 ? `scale(${(1 + threatBurst * 0.08).toFixed(3)})` : "";
      }
      if (refs.l5) {
        const sc = (0.6 + 0.4 * eL5) * (1 - convBell * 0.14 + pulseAt(0.12) * 0.05);
        refs.l5.style.opacity = String(Math.min(1, eL5 * (0.85 + pulseAt(0.12) * 0.25 + syncBell * 0.15)));
        refs.l5.style.transform = `rotate(${syncBlend(r5).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      if (refs.l4) {
        const sc = (0.65 + 0.35 * eL4) * (1 - convBell * 0.12 + pulseAt(0.24) * 0.05);
        const tilt = gyroBell * 16;
        refs.l4.style.opacity = String(Math.min(1, eL4 * (0.85 + pulseAt(0.24) * 0.25 + syncBell * 0.15)));
        refs.l4.style.transform = `rotate(${syncBlend(r4).toFixed(2)}deg) skewX(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      if (refs.l3a) {
        const sc = (0.7 + 0.3 * eL3) * (1 - convBell * 0.1 + pulseAt(0.36) * 0.04);
        refs.l3a.style.opacity = String(Math.min(1, eL3 * (0.85 + pulseAt(0.36) * 0.25)));
        refs.l3a.style.transform = `rotate(${syncBlend(r3a).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      if (refs.l3b) {
        const sc = (0.7 + 0.3 * eL3) * (1 - convBell * 0.1 + pulseAt(0.42) * 0.04);
        refs.l3b.style.opacity = String(Math.min(1, eL3 * (0.82 + pulseAt(0.42) * 0.25)));
        refs.l3b.style.transform = `rotate(${syncBlend(r3b).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      if (refs.l2) {
        const sc = (0.75 + 0.25 * eL2) * (1 - convBell * 0.08 + pulseAt(0.52) * 0.04);
        const tilt = -gyroBell * 12;
        refs.l2.style.opacity = String(Math.min(1, eL2 * (0.85 + pulseAt(0.52) * 0.25 + syncBell * 0.15)));
        refs.l2.style.transform = `rotate(${syncBlend(r2).toFixed(2)}deg) skewY(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      if (refs.l1) {
        const sc = (0.82 + 0.18 * eL1) * (1 - convBell * 0.05 + pulseAt(0.64) * 0.03);
        refs.l1.style.opacity = String(Math.min(1, eL1 * (0.85 + pulseAt(0.64) * 0.25)));
        refs.l1.style.transform = `rotate(${syncBlend(r1).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
      if (refs.hud) {
        refs.hud.style.opacity = String(eHud);
      }

      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (!document.hidden && !mq?.matches && !raf) {
        lastNow = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    if (mq?.matches) {
      applyStatic();
    } else {
      raf = requestAnimationFrame(tick);
    }

    document.addEventListener("visibilitychange", onVisibility);
    mq?.addEventListener?.("change", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      mq?.removeEventListener?.("change", onVisibility);
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    const rx = (-ny * 9).toFixed(2);
    const ry = (nx * 11).toFixed(2);
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    if (svgRef.current) {
      svgRef.current.style.transform = `translate3d(${(nx * 5).toFixed(1)}px, ${(ny * 5).toFixed(1)}px, 0)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    if (wrapRef.current) {
      wrapRef.current.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    }
    if (svgRef.current) {
      svgRef.current.style.transform = "translate3d(0px, 0px, 0)";
    }
  }, []);

  const coreAccent = hasIncident ? "#F87171" : "#E8BB65";
  const coreBright = hasIncident ? "#FCA5A5" : "#FFE3A5";

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onInspect}
      role={onInspect ? "button" : undefined}
      tabIndex={onInspect ? 0 : undefined}
      onKeyDown={onInspect ? (e) => e.key === "Enter" && onInspect(e) : undefined}
      aria-label="Sentinel Intelligence Core"
      style={{
        height: "300px",
        width: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
        cursor: onInspect ? "pointer" : "default",
      }}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        className="w-full h-full max-h-[296px]"
        style={{
          background: "transparent",
          overflow: "visible",
          transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1), filter 300ms ease",
          filter: hovered
            ? `drop-shadow(0 0 22px ${hasIncident ? "rgba(248,113,113,0.35)" : "rgba(232,187,101,0.32)"})`
            : "drop-shadow(0 0 12px rgba(124,58,237,0.22))",
        }}
      >
        <defs>
          <radialGradient id="ns-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreBright} stopOpacity="0.45" />
            <stop offset="32%" stopColor="#A855F7" stopOpacity="0.22" />
            <stop offset="68%" stopColor="#2E1065" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#09060E" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ns-plasma-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE3A5" />
            <stop offset="28%" stopColor={coreAccent} />
            <stop offset="68%" stopColor="#7C3AED" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#09060E" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="ns-gold-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B88635" />
            <stop offset="50%" stopColor="#FFE3A5" />
            <stop offset="100%" stopColor="#B88635" />
          </linearGradient>

          <linearGradient id="ns-violet-gold" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="55%" stopColor="#E8BB65" />
            <stop offset="100%" stopColor="#FFE3A5" />
          </linearGradient>

          <filter id="ns-hud-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Core Illumination */}
        <circle cx="500" cy="500" r="340" fill="url(#ns-core-glow)" />

        {/* LAYER 1: Outer Containment & Mechanical Ticks */}
        <g transform="translate(500, 500)">
          <g ref={(el) => (layerRefs.current.l1 = el)}>
            <circle
              r="418"
              fill="none"
              stroke={coreAccent}
              strokeWidth="2"
              opacity={hovered ? 0.72 : 0.48}
              strokeDasharray="16 6 4 6"
            />
            <circle r="394" fill="none" stroke="#7C3AED" strokeWidth="7" strokeDasharray="2 12" opacity="0.75" />
            <circle r="405" fill="none" stroke="#B88635" strokeWidth="1" opacity="0.55" />
            <circle r="382" fill="none" stroke="#A855F7" strokeWidth="1" opacity="0.45" />
          </g>
          <g stroke={coreBright} strokeWidth="2.5" opacity="0.8">
            <line x1="0" y1="-430" x2="0" y2="-406" />
            <line x1="0" y1="406" x2="0" y2="430" />
            <line x1="-430" y1="0" x2="-406" y2="0" />
            <line x1="406" y1="0" x2="430" y2="0" />
          </g>
        </g>

        {/* LAYER 2: Segmented Expansion Ring Alpha */}
        <g transform="translate(500, 500)">
          <g ref={(el) => (layerRefs.current.l2 = el)}>
            <circle r="338" fill="none" stroke="#29193E" strokeWidth="14" opacity="0.7" />
            <g fill="none" stroke="url(#ns-gold-metal)" strokeWidth="10" filter="url(#ns-hud-glow)" opacity={hovered ? 0.95 : 0.8}>
              <path d="M 0 -338 A 338 338 0 0 1 292.7 -169" strokeDasharray="280 70" />
              <path d="M 0 338 A 338 338 0 0 1 -292.7 169" strokeDasharray="280 70" />
            </g>
            <g fill="none" stroke="#A855F7" strokeWidth="4" opacity="0.7">
              <path d="M 292.7 169 A 338 338 0 0 1 0 338" />
              <path d="M -292.7 -169 A 338 338 0 0 1 0 -338" />
            </g>
          </g>
        </g>

        {/* LAYER 3: Asymmetric Multi-Axis Elliptical Orbital Paths */}
        <g transform="translate(500, 500)">
          <g transform="rotate(28)">
            <ellipse rx="305" ry="142" fill="none" stroke="url(#ns-violet-gold)" strokeWidth="2.5" strokeDasharray="190 36 70 24" opacity="0.88" />
            <g ref={(el) => (layerRefs.current.l3a = el)}>
              <circle cx="305" cy="0" r="6" fill={coreBright} filter="url(#ns-hud-glow)" />
              <circle cx="-305" cy="0" r="4" fill="#A855F7" />
            </g>
          </g>
          <g transform="rotate(-32)">
            <ellipse rx="285" ry="128" fill="none" stroke="url(#ns-gold-metal)" strokeWidth="2" strokeDasharray="140 28 45 20" opacity="0.78" />
            <g ref={(el) => (layerRefs.current.l3b = el)}>
              <circle cx="0" cy="-128" r="5" fill={coreAccent} filter="url(#ns-hud-glow)" />
            </g>
          </g>
          <g transform="rotate(72)">
            <ellipse rx="248" ry="102" fill="none" stroke="#C084FC" strokeWidth="1.5" strokeDasharray="90 22" opacity="0.55" />
          </g>
        </g>

        {/* LAYER 4: Mechanical Gimbal Ring & Armatures */}
        <g transform="translate(500, 500)">
          <g ref={(el) => (layerRefs.current.l4 = el)}>
            <circle r="212" fill="none" stroke="url(#ns-gold-metal)" strokeWidth="4" strokeDasharray="160 28 50 28" filter="url(#ns-hud-glow)" />
            <circle r="196" fill="none" stroke="#B88635" strokeWidth="1.2" opacity="0.55" />
            <path
              d="M -146 -146 L -178 -178 M 146 146 L 178 178 M -146 146 L -178 178 M 146 -146 L 178 -178"
              stroke="url(#ns-gold-metal)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* LAYER 5: 12-Blade Compression Stator */}
        <g transform="translate(500, 500)">
          <g ref={(el) => (layerRefs.current.l5 = el)}>
            <g stroke={coreAccent} strokeWidth="1.4" fill="#160D26" fillOpacity="0.65">
              {Array.from({ length: 12 }).map((_, idx) => (
                <path
                  key={idx}
                  d="M 0 -158 L 28 -124 L 0 -92 L -28 -124 Z"
                  transform={`rotate(${idx * 30})`}
                />
              ))}
            </g>
            <circle r="132" fill="none" stroke="#A855F7" strokeWidth="2" strokeDasharray="10 5" opacity="0.85" />
          </g>
        </g>

        {/* LAYER 6: Central Confidential Energy Core */}
        <g transform="translate(500, 500)">
          <g ref={(el) => (layerRefs.current.core = el)}>
            <circle r="92" fill="#09060E" fillOpacity="0.85" stroke={coreAccent} strokeWidth="3.5" filter="url(#ns-hud-glow)" />
            <circle r="74" fill="url(#ns-plasma-center)" />
            <g stroke={coreBright} strokeWidth="1.5" fill="none" opacity="0.85">
              <polygon points="0,-54 47,27 -47,27" />
              <polygon points="0,54 47,-27 -47,-27" />
              <circle r="28" strokeDasharray="5 3" />
            </g>
            <circle r="9" fill={coreBright} filter="url(#ns-hud-glow)" />
          </g>
        </g>

        {/* Technical HUD Annotations & Corner Brackets */}
        <g ref={(el) => (layerRefs.current.hud = el)}>
          <g opacity={hovered ? 0.34 : 0.2}>
            <circle cx="500" cy="500" r="468" fill="none" stroke="#B88635" strokeWidth="1" strokeDasharray="4 10" />
            <circle cx="500" cy="500" r="446" fill="none" stroke="#7C3AED" strokeWidth="0.75" />
            <path d="M 500 24 L 500 976 M 24 500 L 976 500" stroke="#B88635" strokeWidth="0.75" strokeDasharray="3 8" />
          </g>
          <g fontFamily="'JetBrains Mono', monospace" fontSize="14" fill="#E8BB65" opacity={hovered ? 0.92 : 0.7} letterSpacing="1.6">
            <text x="48" y="64">SYS.CORE // SENTINEL-HUD</text>
            <text x="48" y="86" fontSize="11" fill="#AD98C5">
              POSTURE: {hasIncident ? "CONTAINMENT_ACTIVE" : "AUTONOMOUS_WATCH"}
            </text>
            <text x="952" y="64" textAnchor="end">MECH_DENSITY_V2</text>
            <text x="952" y="86" textAnchor="end" fontSize="11" fill="#AD98C5">
              GYRO_SYNC: LOCKED
            </text>
          </g>
          <g stroke="#B88635" strokeWidth="2" fill="none" opacity={hovered ? 0.78 : 0.45}>
            <path d="M 32 84 L 32 32 L 84 32" />
            <path d="M 968 84 L 968 32 L 916 32" />
            <path d="M 32 916 L 32 968 L 84 968" />
            <path d="M 968 916 L 968 968 L 916 968" />
          </g>
        </g>
      </svg>
    </div>
  );
});

export default SentinelIntelligenceCore;
