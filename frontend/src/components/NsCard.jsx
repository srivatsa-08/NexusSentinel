import { useRef, useCallback } from "react";

/**
 * NsCard — premium bento/panel card with:
 *  - cursor-position internal radial spotlight (--card-x/--card-y CSS vars)
 *  - subtle perspective tilt on mouse move
 *  - keyboard accessible (tabIndex, onKeyDown)
 *  - touch-safe (clears tilt on mouse leave)
 */
export default function NsCard({
  children,
  className = "",
  onClick,
  onKeyDown,
  tabIndex,
  style = {},
  noPerspective = false,
}) {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--card-x", `${x.toFixed(1)}%`);
    card.style.setProperty("--card-y", `${y.toFixed(1)}%`);

    if (!noPerspective) {
      const tiltX = ((y - 50) / 50) * -6;   // ±6 deg vertical
      const tiltY = ((x - 50) / 50) * 6;    // ±6 deg horizontal
      card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-10px) scale(1.015)`;
    }
  }, [noPerspective]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.removeProperty("--card-x");
    card.style.removeProperty("--card-y");
    if (!noPerspective) {
      card.style.transform = "";
    }
  }, [noPerspective]);

  return (
    <div
      ref={cardRef}
      className={`bento-card rounded-xl ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      onKeyDown={onKeyDown ?? (onClick ? (e) => e.key === "Enter" && onClick(e) : undefined)}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
}

