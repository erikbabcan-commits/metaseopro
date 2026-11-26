import * as React from "react";

interface LaserBorderCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

/**
 * LaserBorderCard
 *
 * Titanium-dark tactile container wrapped in a continuous, slowly orbiting
 * 1px neon laser border beam (Google Blue / Search Clarity Glow).
 */
export function LaserBorderCard({
  children,
  className = "",
  glowColor = "#1a73e8",
}: LaserBorderCardProps) {
  return (
    <div className={`relative rounded-3xl p-[1.5px] overflow-hidden group shadow-2xl ${className}`}>
      {/* Circling Neon Laser Beam Layer */}
      <div
        className="absolute -inset-[150%] animate-[spin_6s_linear_infinite] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 340deg, ${glowColor} 360deg)`,
          filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`,
        }}
      />

      {/* Inner tactile surface */}
      <div
        className="relative h-full w-full rounded-[calc(1.5rem-1.5px)] bg-[#171717] p-5 sm:p-6 text-zinc-100 overflow-hidden"
        style={{
          boxShadow:
            "inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -2px 4px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Top specular highlight */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {children}
      </div>
    </div>
  );
}
