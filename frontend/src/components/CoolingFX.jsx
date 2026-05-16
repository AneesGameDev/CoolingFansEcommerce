import { useMemo } from "react";
import { Snowflake, Wind } from "lucide-react";

/**
 * Cooling visual effects layer for hero sections.
 * - Floating snowflakes that drift down
 * - Wind streams that flow across
 * - Frost overlay
 */
export default function CoolingFX({ density = 14 }) {
  const flakes = useMemo(
    () => Array.from({ length: density }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 10 + Math.random() * 18,
      duration: 8 + Math.random() * 10,
      delay: Math.random() * 8,
      opacity: 0.25 + Math.random() * 0.45,
      rotation: Math.random() * 360,
    })),
    [density]
  );

  const streams = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      top: 10 + i * 14,
      size: 80 + Math.random() * 80,
      duration: 5 + Math.random() * 4,
      delay: Math.random() * 4,
    })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Frost gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/20" />
      {/* Subtle radial cool spotlight */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-cyan-300/10 blur-3xl animate-pulse-slow" />

      {/* Snowflakes */}
      {flakes.map((f) => (
        <Snowflake
          key={f.id}
          className="absolute text-white/80 animate-flake"
          style={{
            left: `${f.left}%`,
            top: `-${f.size}px`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
            transform: `rotate(${f.rotation}deg)`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        />
      ))}

      {/* Wind streams */}
      {streams.map((s) => (
        <div
          key={s.id}
          className="absolute h-px bg-gradient-to-r from-transparent via-white/60 to-transparent animate-wind"
          style={{
            top: `${s.top}%`,
            width: `${s.size}px`,
            left: "-200px",
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            boxShadow: "0 0 8px rgba(255,255,255,0.5)",
          }}
        />
      ))}

      {/* Floating wind icons (slow) */}
      {[0, 1, 2, 3].map((i) => (
        <Wind
          key={i}
          className="absolute text-white/15 animate-float"
          style={{
            width: `${60 + i * 20}px`,
            height: `${60 + i * 20}px`,
            top: `${15 + i * 18}%`,
            left: `${8 + i * 22}%`,
            animationDuration: `${10 + i * 2}s`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}
