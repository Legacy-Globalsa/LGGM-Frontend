// ─── Database Entity Types ───────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Year {
  id: string;
  user_id: string;
  year: number;
  tithes_pct: number;
  offering_pct: number;
  savings_pct: number;
  first_fruit_pct: number;
  other_expenses_pct: number;
  created_at: string;
  updated_at: string;
}

export type BudgetStatus = 'under_budget' | 'at_budget' | 'over_budget';

export interface MonthlyBudget {
  id: string;
  user_id: string;
  year_id: string;
  month: number; // 1-12
  income_amount: number;
  tithes: number;
  offering: number;
  savings: number;
  first_fruit: number;
  other_expenses: number;
  loans_payment: number;
  fixed_bills: number;
  other_expenses_amount: number;
  status: BudgetStatus;
  notes: string;
  created_at: string;
  updated_at: string;
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

export interface FixedMonthlyBill {
  id: string;
  user_id: string;
  year_id: string;
  description: string;
  frequency: string;
  amount: number;
  remarks: string;
  payments: BillPayment[];
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  month: number;
  amount: number;
  paid: boolean;
}

export interface Loan {
  id: string;
  user_id: string;
  year_id: string;
  description: string;
  interest_bearing: boolean;
  interest_pct: number;
  duration: string;
  loan_amount: number;
  interest_amount: number;
  payments: LoanPayment[];
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  month: number;
  amount: number;
}

// ─── Dashboard Aggregates ────────────────────────────────────────────

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  totalTithes: number;
  totalOffering: number;
  totalSavings: number;
  totalFirstFruit: number;
  surplus: number;
  monthlyData: MonthlyOverview[];
}

export interface MonthlyOverview {
  month: number;
  monthName: string;
  income: number;
  expenses: number;
  tithes: number;
  offering: number;
  savings: number;
  firstFruit: number;
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
