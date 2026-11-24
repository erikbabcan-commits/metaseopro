import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Rocket,
  Plus,
  TrendingDown,
  Layers,
  Search,
  PenTool,
  Calendar,
  FileCheck,
  History,
  Building2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * TactileFloatingNav
 *
 * Studio-grade, tactile floating navigation pill bar.
 * Activated strictly for authenticated users (`user !== null`).
 * Features:
 * - Fixed above mobile/desktop viewport with `calc(1rem + env(safe-area-inset-bottom))`.
 * - Tactile brand coin on the far left.
 * - Fluid wave cradle with 1px emerald laser contour line under active route.
 * - Direct routing for all core SEO4WEB sections:
 *   1. Dashboard (/dashboard)
 *   2. SEO Raketa (/raketa)
 *   3. AI Tvorba (opens fast creation drawer for Blog Writer, Brief, Plan)
 *   4. Decay Radar (/decay, with pulsing notification badge)
 *   5. Všetky Nástroje (Drawer with Audit, History, Agency settings)
 */
export function TactileFloatingNav() {
  const { user } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const [createDrawerOpen, setCreateDrawerOpen] = React.useState(false);
  const [toolsDrawerOpen, setToolsDrawerOpen] = React.useState(false);

  // If user is not authenticated, do not render floating command dock
  if (!user) {
    return null;
  }

  // Active tab index determination
  let activeIndex = 0;
  if (currentPath === "/raketa") activeIndex = 1;
  else if (currentPath === "/decay") activeIndex = 3;
  else if (
    currentPath === "/audit" ||
    currentPath === "/history" ||
    currentPath === "/settings/agency"
  )
    activeIndex = 4;
  else if (currentPath === "/dashboard") activeIndex = 0;

  return (
    <>
      <nav
        aria-label="Taktílny navigačný panel"
        className="fixed z-40 left-1/2 -translate-x-1/2 w-[calc(100%-1.75rem)] max-w-[520px] select-none pointer-events-auto"
        style={{
          bottom: "calc(0.85rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="relative flex items-center h-[66px] sm:h-[70px] bg-[#171717] rounded-full px-2.5 sm:px-3 border border-white/10 shadow-[0_20px_35px_-8px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.18)]">
          {/* Top specular sheen highlight */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

          {/* 1. Brand Coin (Far Left) */}
          <Link
            to="/dashboard"
            title="SEO4WEB Dashboard"
            className="group relative flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#222428] to-[#121316] border border-white/10 shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.22)] mr-1.5 transition-transform duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <div className="flex items-center justify-center text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)] group-hover:scale-105 transition-transform">
              <span className="font-display font-bold text-xs tracking-tight text-white">
                S<span className="text-emerald-400">4</span>
              </span>
            </div>
          </Link>

          {/* 2. Main Nav Items Container */}
          <div className="relative flex flex-1 items-center justify-between h-full">
            {/* Item 1: Dashboard */}
            <Link
              to="/dashboard"
              className={`relative z-10 flex flex-1 flex-col items-center justify-center h-full text-center transition-all duration-200 focus-visible:outline-none ${
                activeIndex === 0
                  ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutDashboard
                className={`size-4 sm:size-4.5 mb-1 transition-all duration-200 ${
                  activeIndex === 0
                    ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : ""
                }`}
              />
              <span
                className={`text-[10px] tracking-wide transition-all duration-200 ${
                  activeIndex === 0
                    ? "font-medium text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                    : "font-normal"
                }`}
              >
                Prehľad
              </span>
            </Link>

            {/* Item 2: SEO Raketa */}
            <Link
              to="/raketa"
              className={`relative z-10 flex flex-1 flex-col items-center justify-center h-full text-center transition-all duration-200 focus-visible:outline-none ${
                activeIndex === 1
                  ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Rocket
                className={`size-4 sm:size-4.5 mb-1 transition-all duration-200 ${
                  activeIndex === 1
                    ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : ""
                }`}
              />
              <span
                className={`text-[10px] tracking-wide transition-all duration-200 ${
                  activeIndex === 1
                    ? "font-medium text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                    : "font-normal"
                }`}
              >
                Raketa
              </span>
            </Link>

            {/* Item 3: Stredové (+) Tvorba Drawer Trigger */}
            <button
              type="button"
              onClick={() => {
                setCreateDrawerOpen(true);
                setToolsDrawerOpen(false);
              }}
              aria-label="Otvoriť menu tvorby obsahu"
              className="relative z-10 flex flex-1 flex-col items-center justify-center h-full text-center text-zinc-400 hover:text-white transition-all duration-200 focus-visible:outline-none group active:scale-95"
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 group-hover:bg-emerald-500/30 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-200 mb-0.5">
                <Plus className="size-4" />
              </div>
              <span className="text-[9px] font-normal tracking-wide text-zinc-400 group-hover:text-zinc-200">
                Tvorba
              </span>
            </button>

            {/* Item 4: Decay Radar */}
            <Link
              to="/decay"
              className={`relative z-10 flex flex-1 flex-col items-center justify-center h-full text-center transition-all duration-200 focus-visible:outline-none ${
                activeIndex === 3
                  ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="relative">
                <TrendingDown
                  className={`size-4 sm:size-4.5 mb-1 transition-all duration-200 ${
                    activeIndex === 3
                      ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                      : ""
                  }`}
                />
                {/* Live GSC decay pulse dot */}
                <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              </div>
              <span
                className={`text-[10px] tracking-wide transition-all duration-200 ${
                  activeIndex === 3
                    ? "font-medium text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                    : "font-normal"
                }`}
              >
                Radar
              </span>
            </Link>

            {/* Item 5: Viac nástrojov / Audit Drawer Trigger */}
            <button
              type="button"
              onClick={() => {
                setToolsDrawerOpen(true);
                setCreateDrawerOpen(false);
              }}
              aria-label="Otvoriť všetky nástroje"
              className={`relative z-10 flex flex-1 flex-col items-center justify-center h-full text-center transition-all duration-200 focus-visible:outline-none ${
                activeIndex === 4
                  ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers
                className={`size-4 sm:size-4.5 mb-1 transition-all duration-200 ${
                  activeIndex === 4
                    ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : ""
                }`}
              />
              <span
                className={`text-[10px] tracking-wide transition-all duration-200 ${
                  activeIndex === 4
                    ? "font-medium text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                    : "font-normal"
                }`}
              >
                Nástroje
              </span>
            </button>
          </div>

          {/* Bottom continuous neon laser beam underline */}
          <div className="absolute inset-x-8 bottom-1.5 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />
        </div>
      </nav>

      {/* =========================================================================
          QUICK CREATION ACTION DRAWER (+)
          ========================================================================= */}
      {createDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setCreateDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#171717] border border-white/10 p-5 shadow-2xl relative mb-20 text-white animate-in slide-in-from-bottom-6 duration-300 ring-1 ring-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                ⚡ Nový AI Obsah & Taktika
              </span>
              <button
                type="button"
                onClick={() => setCreateDrawerOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-2">
              <Link
                to="/"
                onClick={() => setCreateDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <PenTool className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Blog Writer & SERP Lab</div>
                  <div className="text-[11px] text-zinc-400">
                    Kompletný SEO článok s live konkurentmi
                  </div>
                </div>
              </Link>

              <Link
                to="/brief"
                onClick={() => setCreateDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <FileCheck className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">SEO Brief pre copywritera</div>
                  <div className="text-[11px] text-zinc-400">
                    Štruktúra, LSI kľúčové slová a E-E-A-T
                  </div>
                </div>
              </Link>

              <Link
                to="/plan"
                onClick={() => setCreateDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">30-Dňový Content Plan</div>
                  <div className="text-[11px] text-zinc-400">
                    Publikačný kalendár a tematické klastre
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ALL TOOLS & B2B DRAWER (Audit, History, Agency)
          ========================================================================= */}
      {toolsDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setToolsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#171717] border border-white/10 p-5 shadow-2xl relative mb-20 text-white animate-in slide-in-from-bottom-6 duration-300 ring-1 ring-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                🛠️ SEO4WEB Všetky Nástroje
              </span>
              <button
                type="button"
                onClick={() => setToolsDrawerOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-2">
              <Link
                to="/audit"
                onClick={() => setToolsDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <Search className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Hĺbkový SEO Audit</div>
                  <div className="text-[11px] text-zinc-400">Semrush keyword gap & konkurencia</div>
                </div>
              </Link>

              <Link
                to="/history"
                onClick={() => setToolsDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <History className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">História a Archív</div>
                  <div className="text-[11px] text-zinc-400">
                    Všetky vygenerované články a analýzy
                  </div>
                </div>
              </Link>

              <Link
                to="/settings/agency"
                onClick={() => setToolsDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Whitelabel Agentúra</div>
                  <div className="text-[11px] text-zinc-400">
                    Klientske PDF reporty a vlastné logo
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
