import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Scale,
  FileBarChart,
  Settings,
  HandCoins,
  Sparkles,
  Heart,
  PiggyBank,
  Receipt,
  Landmark,
  MoreHorizontal,
  Wallet,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavLeaf {
  to: string;
  icon: LucideIcon;
  label: string;
}

export interface NavGroup {
  id: string;
  icon: LucideIcon;
  label: string;
  children: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export const navEntries: NavEntry[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/budget", icon: Scale, label: "Budget" },
  { to: "/money-accounts", icon: PiggyBank, label: "Money Accounts" },
  {
    id: "obligations",
    icon: Wallet,
    label: "Path to Abundance",
    children: [
      { to: "/obligations/tithes", icon: HandCoins, label: "Tithes" },
      { to: "/obligations/offering", icon: Sparkles, label: "Offering" },
      { to: "/obligations/first-fruit", icon: Heart, label: "First Fruit" },
      { to: "/obligations/bills", icon: Receipt, label: "Fixed Bills" },
      { to: "/obligations/loans", icon: Landmark, label: "Loans" },
      { to: "/obligations/other", icon: MoreHorizontal, label: "Other" },
    ],
  },
  { to: "/reports", icon: FileBarChart, label: "Reports" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).children !== undefined;
}

const STORAGE_PREFIX = "lggm.nav.group.";

/**
 * Hook returning collapsed state for a nav group, persisted in localStorage,
 * and auto-expanding when the active route falls inside the group.
 */
export function useGroupOpen(group: NavGroup): [boolean, (v: boolean) => void] {
  const { pathname } = useLocation();
  const containsActive = group.children.some((c) => pathname.startsWith(c.to));

  const [open, setOpen] = useState<boolean>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_PREFIX + group.id)
        : null;
    if (stored === "open") return true;
    if (stored === "closed") return false;
    return containsActive;
  });

  // Auto-open when navigating into the group
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  const persistedSet = (v: boolean) => {
    setOpen(v);
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + group.id,
        v ? "open" : "closed",
      );
    } catch {
      /* ignore */
    }
  };

  return [open, persistedSet];
}

/** Shared classes for a sidebar leaf link. */
export function leafLinkClass(
  isActive: boolean,
  options: { collapsed?: boolean; nested?: boolean } = {},
) {
  const { collapsed, nested } = options;
  return cn(
    "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
    collapsed
      ? "justify-center px-2 py-2.5"
      : nested
        ? "px-3 py-2 pl-9 text-[13px]"
        : "px-3 py-2.5",
    isActive
      ? "bg-gradient-to-r from-violet-600/15 to-indigo-600/10 text-violet-600 dark:from-violet-500/20 dark:to-indigo-500/10 dark:text-violet-400"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

interface ActiveBarProps {
  show: boolean;
}
export function ActiveBar({ show }: ActiveBarProps) {
  if (!show) return null;
  return (
    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-600 dark:bg-violet-400" />
  );
}

interface GroupHeaderProps {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
  collapsed?: boolean;
  containsActive: boolean;
}
export function GroupHeader({
  group,
  open,
  onToggle,
  collapsed,
  containsActive,
}: GroupHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        containsActive
          ? "text-violet-600 dark:text-violet-400"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-2",
      )}
      aria-expanded={open}
    >
      <ActiveBar show={containsActive} />
      <group.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          containsActive && "text-violet-600 dark:text-violet-400",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{group.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </>
      )}
    </button>
  );
}

/** Shared NavLink wrapper for leaves used by both desktop and mobile nav. */
export function LeafLink({
  leaf,
  collapsed,
  nested,
  onNavigate,
}: {
  leaf: NavLeaf;
  collapsed?: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={leaf.to}
      end={leaf.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        leafLinkClass(isActive, { collapsed, nested })
      }
    >
      {({ isActive }) => (
        <>
          {!nested && <ActiveBar show={isActive} />}
          <leaf.icon
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              isActive && "text-violet-600 dark:text-violet-400",
            )}
          />
          {!collapsed && <span className="truncate">{leaf.label}</span>}
        </>
      )}
    </NavLink>
  );
}
