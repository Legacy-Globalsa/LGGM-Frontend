import type { MonthlyBudget, Year, DashboardSummary, MonthlyOverview, BudgetStatus } from '@/types';
import { getMonthName } from '@/types';

export const mockYear: Year = {
  id: 'year-1', user_id: 'user-1', year: 2026,
  tithes_pct: 10, offering_pct: 5, savings_pct: 20,
  first_fruit_pct: 5, other_expenses_pct: 60,
  created_at: '2026-01-01', updated_at: '2026-01-01',
};

function mb(month: number, income: number, status: BudgetStatus, notes = ''): MonthlyBudget {
  const t = income * 0.10, o = income * 0.05, s = income * 0.20, ff = income * 0.05;
  const oe = income * 0.60, lp = 1500, fb = 2100;
  const oea = oe - lp - fb;
  return {
    id: `mb-${month}`, user_id: 'user-1', year_id: 'year-1', month,
    income_amount: income, tithes: t, offering: o, savings: s,
    first_fruit: ff, other_expenses: oe, loans_payment: lp,
    fixed_bills: fb, other_expenses_amount: oea, status, notes,
    created_at: `2026-${String(month).padStart(2,'0')}-01`,
    updated_at: `2026-${String(month).padStart(2,'0')}-28`,
  };
}

export const mockBudgets: MonthlyBudget[] = [
  mb(1, 9700, 'under_budget', 'Good start'),
  mb(2, 11000, 'at_budget', 'Freelance boost'),
  mb(3, 9700, 'under_budget'),
  mb(4, 11500, 'over_budget', 'Consulting'),
  mb(5, 8500, 'under_budget'),
  mb(6, 8500, 'under_budget'),
  mb(7, 9000, 'at_budget'),
  mb(8, 8500, 'under_budget'),
  mb(9, 8500, 'under_budget'),
  mb(10, 10000, 'at_budget'),
  mb(11, 8500, 'under_budget'),
  mb(12, 12000, 'over_budget', '13th month bonus'),
];

export function getMockDashboardSummary(): DashboardSummary {
  const monthlyData: MonthlyOverview[] = mockBudgets.map((b) => {
    const exp = b.loans_payment + b.fixed_bills + b.other_expenses_amount;
    return {
      month: b.month, monthName: getMonthName(b.month),
      income: b.income_amount, expenses: exp,
      tithes: b.tithes, offering: b.offering,
      savings: b.savings, firstFruit: b.first_fruit,
      surplus: b.income_amount - b.tithes - b.offering - b.savings - b.first_fruit - exp,
      status: b.status,
    };
  });
  const sum = (fn: (m: MonthlyOverview) => number) => monthlyData.reduce((a, m) => a + fn(m), 0);
  return {
    totalIncome: sum(m => m.income), totalExpenses: sum(m => m.expenses),
    totalTithes: sum(m => m.tithes), totalOffering: sum(m => m.offering),
    totalSavings: sum(m => m.savings), totalFirstFruit: sum(m => m.firstFruit),
    surplus: sum(m => m.surplus), monthlyData,
  };
}

export function getStatusColor(status: BudgetStatus) {
  const map = {
    under_budget: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
    at_budget: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
    over_budget: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
  };
  return map[status];
}

export function getStatusLabel(status: BudgetStatus) {
  const map = { under_budget: 'Under Budget', at_budget: 'At Budget', over_budget: 'Over Budget' };
  return map[status];
}
