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
    { key: "dashboard", label: "Prehľad", icon: LayoutDashboard },
    { key: "status", label: "Indexácia", icon: Activity },
    { key: "projects", label: "Projekty", icon: FolderGit2 },
  ];

  return (
    <div className="w-full select-none" id="segmented-bar">
      <div className="grid grid-cols-3 p-1 rounded-full bg-surface-container shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          const count = counts?.[tab.key];

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`py-1.5 px-2 rounded-full text-xs flex items-center justify-center gap-1.5 transition-all duration-200 focus-visible:outline-none ${
                isActive
                  ? "bg-surface-pure text-primary font-semibold shadow-xs"
                  : "text-text-secondary font-medium hover:text-text-primary"
              }`}
            >
              <Icon className="size-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">{tab.label}</span>
              {typeof count === "number" && count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? "bg-primary-fixed/60 text-on-primary-fixed"
                      : "bg-surface-container-high text-text-secondary"
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
