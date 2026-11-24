import * as React from "react";
import { LayoutDashboard, Activity, FolderGit2 } from "lucide-react";

export type SegmentedTabKey = "dashboard" | "status" | "projects";

interface TactileSegmentedBarProps {
  activeTab: SegmentedTabKey;
  onTabChange: (tab: SegmentedTabKey) => void;
  counts?: {
    dashboard?: number;
    status?: number;
    projects?: number;
  };
}

/**
 * TactileSegmentedBar
 *
 * Single-row segmented control [ Dashboard ] [ Status ] [ Projects ]
 * with frosted-glass glowing active pill indicator.
 */
export function TactileSegmentedBar({ activeTab, onTabChange, counts }: TactileSegmentedBarProps) {
  const tabs: Array<{ key: SegmentedTabKey; label: string; icon: React.ElementType }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "status", label: "Status", icon: Activity },
    { key: "projects", label: "Projects", icon: FolderGit2 },
  ];

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const leftPercent = (activeIndex / tabs.length) * 100;

  return (
    <div className="relative w-full max-w-md mx-auto my-3 select-none">
      <div className="relative flex items-center h-11 rounded-2xl bg-[#171717] p-1 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.3)]">
        {/* Top subtle sheen */}
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Sliding Frosted Glass Active Pill */}
        <div
          className="absolute top-1 bottom-1 w-[calc(33.333%-2px)] rounded-xl bg-gradient-to-b from-white/20 via-white/10 to-white/5 border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0"
          style={{
            left: `calc(${leftPercent}% + 1px)`,
          }}
        >
          {/* Emerald accent laser glow line at bottom of active pill */}
          <div className="absolute inset-x-3 bottom-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981]" />
        </div>

        {/* Tab Buttons */}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          const count = counts?.[tab.key];

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 h-full text-xs font-semibold transition-colors focus-visible:outline-none ${
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon
                className={`size-3.5 transition-transform ${
                  isActive ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" : ""
                }`}
              />
              <span>{tab.label}</span>
              {typeof count === "number" && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/5 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
