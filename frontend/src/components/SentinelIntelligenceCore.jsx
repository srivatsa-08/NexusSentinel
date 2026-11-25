import React, { useRef, useState, useEffect, useCallback } from "react";

/**
 * SentinelIntelligenceCore
 * SVG-based JARVIS Confidential Core — Mechanical Density Expansion
 * styled in the Nexus Sentinel Purple & Champagne Gold palette.
 * - Transparent background so the global PrismBackground remains visible.
 * - Continuous multi-axis gyroscopic & elliptical orbital animations.
 * - Cursor-responsive perspective & parallax via direct DOM transform (0 React re-renders).
 */
const SentinelIntelligenceCore = React.memo(function SentinelIntelligenceCore({
  hasIncident = false,
  onInspect,
}) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setPaused(Boolean(document.hidden || mq?.matches));
    sync();
    document.addEventListener("visibilitychange", sync);
    mq?.addEventListener?.("change", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      mq?.removeEventListener?.("change", sync);
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
  const animState = paused ? "paused" : "running";

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

        {/* Subtle HUD Grid & Crosshair */}
        <g opacity={hovered ? 0.34 : 0.2}>
          <circle cx="500" cy="500" r="468" fill="none" stroke="#B88635" strokeWidth="1" strokeDasharray="4 10" />
          <circle cx="500" cy="500" r="446" fill="none" stroke="#7C3AED" strokeWidth="0.75" />
          <path d="M 500 24 L 500 976 M 24 500 L 976 500" stroke="#B88635" strokeWidth="0.75" strokeDasharray="3 8" />
        </g>

        {/* Ambient Core Illumination */}
        <circle cx="500" cy="500" r="340" fill="url(#ns-core-glow)" />

        {/* LAYER 1: Outer Containment & Mechanical Ticks */}
        <g transform="translate(500, 500)">
          <g style={{ animation: `jarvis-cw 90s linear infinite`, animationPlayState: animState }}>
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
          {/* Cardinal Technical Ticks */}
          <g stroke={coreBright} strokeWidth="2.5" opacity="0.8">
            <line x1="0" y1="-430" x2="0" y2="-406" />
            <line x1="0" y1="406" x2="0" y2="430" />
            <line x1="-430" y1="0" x2="-406" y2="0" />
            <line x1="406" y1="0" x2="430" y2="0" />
          </g>
        </g>

        {/* LAYER 2: Segmented Expansion Ring Alpha */}
        <g transform="translate(500, 500)">
          <g style={{ animation: `jarvis-cw 42s linear infinite`, animationPlayState: animState }}>
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
            <g style={{ animation: `jarvis-cw 18s linear infinite`, animationPlayState: animState }}>
              <circle cx="305" cy="0" r="6" fill={coreBright} filter="url(#ns-hud-glow)" />
              <circle cx="-305" cy="0" r="4" fill="#A855F7" />
            </g>
          </g>
          <g transform="rotate(-32)">
            <ellipse rx="285" ry="128" fill="none" stroke="url(#ns-gold-metal)" strokeWidth="2" strokeDasharray="140 28 45 20" opacity="0.78" />
            <g style={{ animation: `jarvis-ccw 24s linear infinite`, animationPlayState: animState }}>
              <circle cx="0" cy="-128" r="5" fill={coreAccent} filter="url(#ns-hud-glow)" />
            </g>
          </g>
          <g transform="rotate(72)">
            <ellipse rx="248" ry="102" fill="none" stroke="#C084FC" strokeWidth="1.5" strokeDasharray="90 22" opacity="0.55" />
          </g>
        </g>

        {/* LAYER 4: Mechanical Gimbal Ring & Armatures */}
        <g transform="translate(500, 500)">
          <g style={{ animation: `jarvis-ccw 28s linear infinite`, animationPlayState: animState }}>
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
          <g style={{ animation: `jarvis-ccw 19s linear infinite`, animationPlayState: animState }}>
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
          <circle r="92" fill="#09060E" fillOpacity="0.85" stroke={coreAccent} strokeWidth="3.5" filter="url(#ns-hud-glow)" />
          <circle
            r="74"
            fill="url(#ns-plasma-center)"
            style={{ animation: `jarvis-pulse 3.2s ease-in-out infinite`, animationPlayState: animState }}
          />
          <g stroke={coreBright} strokeWidth="1.5" fill="none" opacity="0.85">
            <polygon points="0,-54 47,27 -47,27" />
            <polygon points="0,54 47,-27 -47,-27" />
            <circle r="28" strokeDasharray="5 3" />
          </g>
          <circle
            r="9"
            fill={coreBright}
            filter="url(#ns-hud-glow)"
            style={{ animation: `jarvis-pulse 1.6s ease-in-out infinite`, animationPlayState: animState }}
          />
        </g>

        {/* Technical HUD Annotations */}
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

        {/* Corner Framing Brackets */}
        <g stroke="#B88635" strokeWidth="2" fill="none" opacity={hovered ? 0.78 : 0.45}>
          <path d="M 32 84 L 32 32 L 84 32" />
          <path d="M 968 84 L 968 32 L 916 32" />
          <path d="M 32 916 L 32 968 L 84 968" />
          <path d="M 968 916 L 968 968 L 916 968" />
        </g>
      </svg>
    </div>
  );
});

export default SentinelIntelligenceCore;

