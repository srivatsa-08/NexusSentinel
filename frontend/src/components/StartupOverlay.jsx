import React, { useEffect, useState } from "react";

/**
 * StartupOverlay — 2.8s JARVIS-inspired cinematic startup sequence.
 * Plays once per browser session (sessionStorage), respects prefers-reduced-motion,
 * and includes a Skip button + failsafe timeout so it never blocks app access.
 */
export default function StartupOverlay({ onComplete }) {
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      onComplete();
      return undefined;
    }

    const tDissolve = window.setTimeout(() => setDissolving(true), 2250);
    const tDone = window.setTimeout(() => {
      try {
        sessionStorage.setItem("ns_startup_played", "1");
      } catch {
        // Ignore storage errors
      }
      onComplete();
    }, 2850);

    const onKey = (e) => {
      if (e.key === "Escape") {
        try {
          sessionStorage.setItem("ns_startup_played", "1");
        } catch {
          // Ignore
        }
        onComplete();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(tDissolve);
      window.clearTimeout(tDone);
      window.removeEventListener("keydown", onKey);
    };
  }, [onComplete]);

  const handleSkip = () => {
    try {
      sessionStorage.setItem("ns_startup_played", "1");
    } catch {
      // Ignore
    }
    onComplete();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09060E] select-none transition-all duration-500 ease-out ${
        dissolving ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      aria-label="Nexus Sentinel Startup Sequence"
    >
      {/* Central Holographic Rings */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        <div className="ns-startup-pulse absolute w-16 h-16 rounded-full bg-radial from-[#FFE3A5]/60 via-[#7C3AED]/50 to-transparent blur-md" />
        <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
          <circle
            cx="120"
            cy="120"
            r="34"
            fill="none"
            stroke="#E8BB65"
            strokeWidth="2"
            className="ns-startup-ring-1"
          />
          <circle
            cx="120"
            cy="120"
            r="58"
            fill="none"
            stroke="#A855F7"
            strokeWidth="1.5"
            strokeDasharray="36 14"
            className="ns-startup-ring-2"
          />
          <circle
            cx="120"
            cy="120"
            r="84"
            fill="none"
            stroke="#B88635"
            strokeWidth="1.2"
            strokeDasharray="60 18 14 18"
            className="ns-startup-ring-3"
          />
          <circle
            cx="120"
            cy="120"
            r="104"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="1"
            strokeDasharray="4 10"
            className="ns-startup-ring-4"
          />
          <circle cx="120" cy="120" r="8" fill="#FFE3A5" />
        </svg>
      </div>

      {/* Title & Subtitle with Letter-Spacing Reveal */}
      <div className="mt-4 text-center space-y-2 relative overflow-hidden px-6">
        <h1 className="ns-startup-title text-xl sm:text-2xl font-semibold text-[#F3E8FF] tracking-[0.24em]">
          NEXUS <span className="text-[#E8BB65]">SENTINEL</span>
        </h1>
        <p className="ns-startup-sub text-[11px] font-mono text-[#AD98C5] tracking-[0.28em]">
          INTELLIGENCE · RESILIENCE · PROTECTION
        </p>
        <div className="ns-startup-scanline pointer-events-none" />
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-6 right-6 px-3 py-1.5 rounded-lg bg-[#160D26]/60 hover:bg-[#29193E]/80 border border-[#E8BB65]/35 text-[11px] font-mono text-[#FFE3A5] transition"
      >
        Skip Intro
      </button>
    </div>
  );
}

