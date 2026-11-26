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
  SearchCode,
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
    currentPath === "/settings/agency" ||
    currentPath === "/serplab"
  )
    activeIndex = 4;
  else if (currentPath === "/dashboard") activeIndex = 0;

  return (
    <>
      <nav
        aria-label="Taktílny navigačný panel"
        className="fixed bottom-0 left-0 right-0 w-full z-40 pb-safe bg-surface/90 backdrop-blur-xl border-t border-border-subtle shadow-[0_-2px_12px_rgba(60,64,67,0.08)] select-none pointer-events-auto"
      >
        <div className="flex justify-between items-center h-16 px-2 max-w-[460px] mx-auto relative">
          {/* Item 1: Dashboard */}
          <Link
            to="/dashboard"
            aria-current={activeIndex === 0 ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center h-12 gap-0.5 transition-colors focus-visible:outline-none ${
              activeIndex === 0
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <div className="w-10 h-6 flex items-center justify-center transition-all">
              <LayoutDashboard
                className={`size-5 transition-all ${
                  activeIndex === 0
                    ? "text-primary drop-shadow-[0_0_6px_rgba(26,115,232,0.35)]"
                    : ""
                }`}
              />
            </div>
            <span className="text-[11px] leading-[14px] tracking-[0.02em]">Dashboard</span>
          </Link>

          {/* Item 2: SEO Raketa */}
          <Link
            to="/raketa"
            aria-current={activeIndex === 1 ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center h-12 gap-0.5 transition-colors focus-visible:outline-none ${
              activeIndex === 1
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <div className="w-10 h-6 flex items-center justify-center transition-all">
              <Rocket
                className={`size-5 transition-all ${
                  activeIndex === 1
                    ? "text-primary drop-shadow-[0_0_6px_rgba(26,115,232,0.35)]"
                    : ""
                }`}
              />
            </div>
            <span className="text-[11px] leading-[14px] tracking-[0.02em]">Raketa</span>
          </Link>

          {/* Item 3: Stredové (+) Tvorba Drawer Trigger */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={() => {
                setCreateDrawerOpen(true);
                setToolsDrawerOpen(false);
              }}
              aria-label="Otvoriť menu tvorby obsahu"
              className="w-12 h-12 -mt-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_4px_12px_rgba(0,91,191,0.35)] hover:bg-primary-container transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Plus className="size-6" />
            </button>
            <span className="text-[11px] leading-[14px] tracking-[0.02em] font-medium text-text-secondary mt-0.5">
              Tvorba
            </span>
          </div>

          {/* Item 4: Decay Radar */}
          <Link
            to="/decay"
            aria-current={activeIndex === 3 ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center h-12 gap-0.5 transition-colors focus-visible:outline-none ${
              activeIndex === 3
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <div className="relative w-10 h-6 flex items-center justify-center transition-all">
              <TrendingDown
                className={`size-5 transition-all ${
                  activeIndex === 3
                    ? "text-primary drop-shadow-[0_0_6px_rgba(26,115,232,0.35)]"
                    : ""
                }`}
              />
              <span className="absolute top-0.5 right-1.5 size-1.5 rounded-full bg-google-green animate-pulse" />
            </div>
            <span className="text-[11px] leading-[14px] tracking-[0.02em]">Radar</span>
          </Link>

          {/* Item 5: Viac nástrojov / Audit Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              setToolsDrawerOpen(true);
              setCreateDrawerOpen(false);
            }}
            aria-label="Otvoriť všetky nástroje"
            className={`flex-1 flex flex-col items-center justify-center h-12 gap-0.5 transition-colors focus-visible:outline-none ${
              activeIndex === 4
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <div className="w-10 h-6 flex items-center justify-center transition-all">
              <Layers
                className={`size-5 transition-all ${
                  activeIndex === 4
                    ? "text-primary drop-shadow-[0_0_6px_rgba(26,115,232,0.35)]"
                    : ""
                }`}
              />
            </div>
            <span className="text-[11px] leading-[14px] tracking-[0.02em]">Nástroje</span>
          </button>
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
                to="/serplab"
                onClick={() => setToolsDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <SearchCode className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">SerpLab Sandbox & SERP</div>
                  <div className="text-[11px] text-zinc-400">
                    Google simulátor, rich snippety a CTR
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
