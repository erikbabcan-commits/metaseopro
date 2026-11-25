import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useIsFetching } from "@tanstack/react-query";
import { LASER_START_EVENT, LASER_DONE_EVENT } from "@/lib/laser-loader";

/**
 * TopBarLaserLoader
 *
 * Studio-grade, non-blocking, laser pulse progress bar (YouTube / GitHub / Linear style).
 * Fixed at the very top of the viewport (2.5px height) with an Emerald-500 neon glow.
 *
 * Automatically tracks:
 * 1. TanStack Router page transitions and pending loaders.
 * 2. TanStack Query background fetch states (isFetching > 0).
 * 3. Manual triggers via `startLaserProgress()` and `stopLaserProgress()`.
 */
export function TopBarLaserLoader() {
  const isNavigating = useRouterState({
    select: (s) => s.isLoading || s.status === "pending",
  });
  const isFetching = useIsFetching();

  const [manualCount, setManualCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Listen for manual trigger events
  useEffect(() => {
    const handleStart = () => setManualCount((c) => c + 1);
    const handleDone = () => setManualCount((c) => Math.max(0, c - 1));

    window.addEventListener(LASER_START_EVENT, handleStart);
    window.addEventListener(LASER_DONE_EVENT, handleDone);

    return () => {
      window.removeEventListener(LASER_START_EVENT, handleStart);
      window.removeEventListener(LASER_DONE_EVENT, handleDone);
    };
  }, []);

  const isActive = isNavigating || isFetching > 0 || manualCount > 0;

  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    clearAllTimers();

    if (isActive) {
      // Start or continue loading
      setFading(false);
      setVisible(true);

      // Start with initial tick if not already moving
      setProgress((prev) => (prev > 0 ? prev : 16));

      // Realistic decelerating progress trickle
      const t1 = setTimeout(() => setProgress((p) => Math.max(p, 36)), 120);
      const t2 = setTimeout(() => setProgress((p) => Math.max(p, 58)), 320);
      const t3 = setTimeout(() => setProgress((p) => Math.max(p, 74)), 680);
      const t4 = setTimeout(() => setProgress((p) => Math.max(p, 86)), 1400);
      const t5 = setTimeout(() => setProgress((p) => Math.max(p, 93)), 2600);

      timersRef.current.push(t1, t2, t3, t4, t5);
    } else {
      // Transition to complete if currently visible
      if (visible) {
        // Accelerate to 100%
        setProgress(100);

        // Fade out
        const fadeTimer = setTimeout(() => {
          setFading(true);
        }, 220);

        // Reset and hide
        const hideTimer = setTimeout(() => {
          setVisible(false);
          setFading(false);
          setProgress(0);
        }, 520);

        timersRef.current.push(fadeTimer, hideTimer);
      }
    }

    return () => {
      clearAllTimers();
    };
  }, [isActive, visible]);

  if (!visible && progress === 0) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!visible}
      className={`fixed top-0 inset-x-0 z-[99999] pointer-events-none transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ height: "2.5px" }}
    >
      {/* Background track subtle glow */}
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-200 ease-out relative"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 10px rgba(16, 185, 129, 0.7), 0 0 4px rgba(52, 211, 153, 0.9)",
        }}
      >
        {/* Leading Laser Head Flare */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-3 -mr-2 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(52,211,153,0.8) 40%, transparent 80%)",
            filter: "drop-shadow(0 0 6px bg-mark) drop-shadow(0 0 14px #34d399)",
          }}
        />
      </div>
    </div>
  );
}
