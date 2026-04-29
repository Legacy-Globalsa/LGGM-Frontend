// ─── Database Entity Types ───────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Year-level distribution defaults. */
export interface Year {
  id: string;
  user_id: string;
  year: number;
  is_active: boolean;
  tithes_pct: number;
  offering_pct: number;
  savings_pct: number;
  first_fruit_pct: number;
  other_expenses_pct: number;
  created_at: string;
  updated_at: string;
}

/**
 * Per-month percentage override. Any null field falls back to the year default.
 * One row per (year_id, month).
 */
export interface YearMonthOverride {
  id: string;
  user_id: string;
  year_id: string;
  month: number; // 1-12
  tithes_pct: number | null;
  offering_pct: number | null;
  savings_pct: number | null;
  first_fruit_pct: number | null;
  other_expenses_pct: number | null;
  notes: string;
}

export type BudgetStatus = 'under_budget' | 'at_budget' | 'over_budget';

export interface MonthlyBudget {
  id: string;
  user_id: string;
  year_id: string;
  month: number; // 1-12
  /** Sum of all income transactions for the month (source: transactions table). */
  income_amount: number;
  // Planned (income × resolved %)
  tithes_planned: number;
  offering_planned: number;
  savings_planned: number;
  first_fruit_planned: number;
  other_planned: number;
  // Actual (rolled up from obligation_entries)
  tithes_actual: number;
  offering_actual: number;
  savings_actual: number; // only includes transferred savings entries
  first_fruit_actual: number;
  loans_actual: number;
  fixed_bills_actual: number;
  /** Sum of all expense transactions for the month (source: transactions table). */
  other_actual: number;
  status: BudgetStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Per-month income + expense totals derived from the transactions table. */
export interface TransactionMonthAggregate {
  month: number;
  income: number;
  expenses: number;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  year_id: string;
  month: number;
  transaction_date: string;
  description: string;
  type: TransactionType;
  category_id: string;
  category_name?: string;
  amount: number;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  created_at: string;
}

// ─── Obligations (unified) ───────────────────────────────────────────

export type ObligationKind =
  | 'tithes'
  | 'offering'
  | 'first_fruit'
  | 'savings'
  | 'fixed_bill'
  | 'loan'
  | 'other';

export interface Obligation {
  id: string;
  user_id: string;
  year_id: string;
  kind: ObligationKind;
  description: string;
  frequency: 'Monthly' | 'Quarterly' | 'Annual' | 'One-off';
  /** Fallback monthly amount for fixed obligations. Null for distributions. */
  default_amount: number | null;
  remarks: string;
  // Loan-specific (undefined when kind !== 'loan')
  interest_bearing?: boolean;
  interest_pct?: number;
  duration?: string;
  loan_amount?: number;
  interest_amount?: number;
  entries: ObligationEntry[];
  created_at: string;
  updated_at: string;
}

/** One entry per (obligation, month). Holds both planned and actual. */
export interface ObligationEntry {
  id: string;
  obligation_id: string;
  year_id: string;
  month: number; // 1-12
  planned_amount: number;
  actual_amount: number;
  /** True for fixed bills/loans when paid; for distributions when given. */
  paid: boolean;
  /** Savings only — until true, actual_amount does NOT count toward actual KPI. */
  transferred_to_bank?: boolean;
  transferred_at?: string | null;
  /** ID of the money account that this savings entry was transferred to. */
  transferred_to_account?: string | null;
  notes: string;
}

// ─── Money Accounts ──────────────────────────────────────────────────

export type MoneyAccountType =
  | 'bank_account'
  | 'cash_on_hand'
  | 'stc_bank'
  | 'gcash'
  | 'e_wallet'
  | 'other';

export const MONEY_ACCOUNT_TYPE_META: Record<
  MoneyAccountType,
  { label: string; description: string }
> = {
  bank_account: { label: 'Bank Account', description: 'Traditional bank savings or checking account' },
  cash_on_hand: { label: 'Cash on Hand (Wallet)', description: 'Physical cash or wallet balance' },
  stc_bank:     { label: 'STC Bank', description: 'STC Bank digital account' },
  gcash:        { label: 'GCash', description: 'GCash e-wallet balance' },
  e_wallet:     { label: 'E-Wallet', description: 'Other electronic wallet (PayPal, Maya, etc.)' },
  other:        { label: 'Other', description: 'Other financial account or storage' },
};

export interface MoneyAccount {
  id: string;
  user_id: string;
  name: string;
  type: MoneyAccountType;
  /** Optional identifier (last 4 digits, account name, etc.) */
  account_identifier: string;
  balance: number;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Dashboard Aggregates ────────────────────────────────────────────

export interface PlannedActualPair {
  planned: number;
  actual: number;
}

export interface DashboardSummary {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  // Planned vs Actual per distribution
  tithes: PlannedActualPair;
  offering: PlannedActualPair;
  savings: PlannedActualPair; // actual = transferred-to-account only
  firstFruit: PlannedActualPair;
  surplus: number;
  monthlyData: MonthlyOverview[];
}

export interface MonthlyOverview {
  month: number;
  monthName: string;
  income: number;
  expenses: number;
  tithes: PlannedActualPair;
  offering: PlannedActualPair;
  savings: PlannedActualPair;
  firstFruit: PlannedActualPair;
  surplus: number;
  status: BudgetStatus;
}

// ─── Helpers ─────────────────────────────────────────────────────────

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export function getMonthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

export function getMonthShort(month: number): string {
  return MONTH_SHORT[month - 1] ?? '';
}

export type PctField =
  | 'tithes_pct'
  | 'offering_pct'
  | 'savings_pct'
  | 'first_fruit_pct'
  | 'other_expenses_pct';

/** Resolve effective percentage for a given month (override → year default). */
export function resolvePct(
  field: PctField,
  year: Year,
  override?: YearMonthOverride | null,
): number {
  const v = override?.[field];
  return v == null ? year[field] : v;
}

export const OBLIGATION_KIND_META: Record<
  ObligationKind,
  {
    label: string;
    pluralLabel: string;
    /** Year-level pct field driving the planned amount (income × pct). Undefined for fixed kinds. */
    pctField?: Extract<
      PctField,
      'tithes_pct' | 'offering_pct' | 'savings_pct' | 'first_fruit_pct'
    >;
  }
> = {
  tithes:      { label: 'Tithe',       pluralLabel: 'Tithes',           pctField: 'tithes_pct' },
  offering:    { label: 'Offering',    pluralLabel: 'Offerings',        pctField: 'offering_pct' },
  first_fruit: { label: 'First Fruit', pluralLabel: 'First Fruits',     pctField: 'first_fruit_pct' },
  savings:     { label: 'Money Account', pluralLabel: 'Money Accounts', pctField: 'savings_pct' },
  fixed_bill:  { label: 'Fixed Bill',  pluralLabel: 'Fixed Bills' },
  loan:        { label: 'Loan',        pluralLabel: 'Loans' },
  other:       { label: 'Other',       pluralLabel: 'Other Obligations' },
};

