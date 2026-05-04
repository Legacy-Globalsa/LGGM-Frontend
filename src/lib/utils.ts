import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BudgetStatus } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: BudgetStatus): string {
  const map: Record<BudgetStatus, string> = {
    under_budget: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
    at_budget: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
    over_budget: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
  };
  return map[status] ?? '';
}

export function getStatusLabel(status: BudgetStatus): string {
  const map: Record<BudgetStatus, string> = {
    under_budget: 'Under Budget',
    at_budget: 'At Budget',
    over_budget: 'Over Budget',
  };
  return map[status] ?? status;
}
