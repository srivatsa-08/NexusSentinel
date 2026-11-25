import { useRef, useCallback } from "react";

/**
 * InteractiveCard — unified interactive surface used across all Nexus Sentinel pages.
 * - Hover elevation (-7px), scale (1.025), champagne-gold border & shadow
 * - Cursor-following internal illumination (--card-x / --card-y)
 * - Subtle perspective tilt via direct DOM transform (0 React re-renders)
 * - Keyboard focus accessible; sibling opacity reduction scoped to .interactive-group
 */
export default function InteractiveCard({
  children,
  className = "",
  onClick,
  onKeyDown,
  tabIndex,
  style = {},
  noPerspective = false,
  title,
}) {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      card.style.setProperty("--card-x", `${x.toFixed(1)}%`);
      card.style.setProperty("--card-y", `${y.toFixed(1)}%`);

      if (!noPerspective) {
        const tiltX = ((y - 50) / 50) * -5;
        const tiltY = ((x - 50) / 50) * 5;
        card.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-7px) scale(1.025)`;
      }
    },
    [noPerspective]
  );

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
      title={title}
      className={`interactive-card bento-card rounded-xl ${onClick ? "cursor-pointer" : ""} ${className}`}
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
