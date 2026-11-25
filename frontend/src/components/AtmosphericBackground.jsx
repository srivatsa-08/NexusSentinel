import { useEffect, useRef } from "react";

/**
 * AtmosphericBackground
 * - Updates CSS custom properties --mouse-x/--mouse-y on <html> for the
 *   global cursor spotlight used by bento cards and the body radial.
 * - Renders SVG-based floating particles + ambient glows via CSS only
 *   (no WebGL — zero performance cost).
 * Fixed position, z-index 0, pointer-events none.
 */
export default function AtmosphericBackground() {
  const rafRef = useRef(null);
  const posRef = useRef({ x: 50, y: 50, tx: 50, ty: 50 });

  useEffect(() => {
    const onMove = (e) => {
      posRef.current.tx = (e.clientX / window.innerWidth) * 100;
      posRef.current.ty = (e.clientY / window.innerHeight) * 100;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      const p = posRef.current;
      // spring smoothing
      p.x += (p.tx - p.x) * 0.07;
      p.y += (p.ty - p.y) * 0.07;
      document.documentElement.style.setProperty("--mouse-x", `${p.x.toFixed(2)}%`);
      document.documentElement.style.setProperty("--mouse-y", `${p.y.toFixed(2)}%`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Global cursor radial — rendered via CSS on body, we just supply vars */}
      {/* Dot grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(168,85,247,0.12) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          opacity: 0.6,
        }}
      />

      {/* Ambient radial orbs */}
      <div style={{
        position: "absolute",
        top: "10%", left: "5%",
        width: "520px", height: "420px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
        filter: "blur(60px)",
        animation: "pulse-glow 7s ease-in-out infinite",
        animationDelay: "0s",
      }} />
      <div style={{
        position: "absolute",
        bottom: "5%", right: "8%",
        width: "440px", height: "380px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)",
        filter: "blur(50px)",
        animation: "pulse-glow 9s ease-in-out infinite",
        animationDelay: "-3s",
      }} />
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "600px", height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(46,16,101,0.12) 0%, transparent 65%)",
        filter: "blur(80px)",
        animation: "pulse-glow 11s ease-in-out infinite",
        animationDelay: "-6s",
      }} />

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            bottom: `${p.startY}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `float-particle ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
          }}
        />
      ))}

      {/* Thin shimmer lines */}
      {LINES.map((l) => (
        <div
          key={l.id}
          style={{
            position: "absolute",
            top: `${l.top}%`,
            left: `${l.left}%`,
            width: `${l.width}px`,
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${l.color}, transparent)`,
            transformOrigin: "left center",
            animation: `shimmer-line ${l.duration}s ease-in-out infinite`,
            animationDelay: `${l.delay}s`,
            opacity: 0,
            transform: "rotate(-2deg)",
          }}
        />
      ))}
    </div>
  );
}

const PARTICLES = [
  { id: 0,  x: 8,  startY: 10, size: 3, duration: 12, delay: 0,   color: "rgba(168,85,247,0.70)" },
  { id: 1,  x: 20, startY: 20, size: 2, duration: 15, delay: 2,   color: "rgba(192,132,252,0.60)" },
  { id: 2,  x: 35, startY: 5,  size: 4, duration: 10, delay: 4,   color: "rgba(124,58,237,0.65)" },
  { id: 3,  x: 52, startY: 15, size: 2, duration: 14, delay: 1,   color: "rgba(216,180,254,0.55)" },
  { id: 4,  x: 68, startY: 8,  size: 3, duration: 11, delay: 5,   color: "rgba(168,85,247,0.60)" },
  { id: 5,  x: 78, startY: 25, size: 2, duration: 16, delay: 3,   color: "rgba(192,132,252,0.50)" },
  { id: 6,  x: 90, startY: 12, size: 3, duration: 13, delay: 7,   color: "rgba(124,58,237,0.70)" },
  { id: 7,  x: 15, startY: 35, size: 2, duration: 18, delay: 6,   color: "rgba(216,180,254,0.45)" },
  { id: 8,  x: 45, startY: 30, size: 4, duration:  9, delay: 8,   color: "rgba(168,85,247,0.75)" },
  { id: 9,  x: 62, startY: 40, size: 2, duration: 20, delay: 0.5, color: "rgba(192,132,252,0.55)" },
  { id: 10, x: 83, startY: 18, size: 3, duration: 12, delay: 9,   color: "rgba(124,58,237,0.60)" },
  { id: 11, x: 28, startY: 45, size: 2, duration: 17, delay: 2.5, color: "rgba(216,180,254,0.50)" },
];

const LINES = [
  { id: 0, top: 20, left: 10, width: 180, duration: 6, delay: 0,   color: "rgba(168,85,247,0.40)" },
  { id: 1, top: 55, left: 60, width: 220, duration: 8, delay: 2,   color: "rgba(124,58,237,0.35)" },
  { id: 2, top: 80, left: 25, width: 150, duration: 7, delay: 4,   color: "rgba(192,132,252,0.30)" },
  { id: 3, top: 35, left: 75, width: 190, duration: 9, delay: 1,   color: "rgba(216,180,254,0.25)" },
];

