import type { Obligation, ObligationEntry, ObligationKind, BudgetStatus, Year, MonthlyBudget, DashboardSummary, MonthlyOverview } from '@/types';
import { getMonthName, resolvePct } from '@/types';
import { mockYears, mockYearMonthOverrides, findYear, findOverride } from './mockYears';

// ─── Per-month income (matches mockTransactions roughly) ─────────────

const incomeByMonth2026: Record<number, number> = {
  1: 9700, 2: 11000, 3: 9700, 4: 11500, 5: 8500, 6: 8500,
  7: 9000, 8: 8500, 9: 8500, 10: 10000, 11: 8500, 12: 12000,
};

const incomeByMonth2025: Record<number, number> = {
  1: 8500, 2: 8500, 3: 8500, 4: 8500, 5: 8500, 6: 8500,
  7: 8500, 8: 8500, 9: 8500, 10: 8500, 11: 8500, 12: 9500,
};

export function getIncome(yearNumber: number, month: number): number {
  return (yearNumber === 2026 ? incomeByMonth2026 : incomeByMonth2025)[month] ?? 0;
}

// ─── Helpers to build entries ────────────────────────────────────────

function makeEntry(
  obligationId: string,
  yearId: string,
  month: number,
  planned: number,
  actual: number,
  paid: boolean,
  opts: { transferred_to_bank?: boolean; transferred_at?: string | null; notes?: string } = {},
): ObligationEntry {
  return {
    id: `oe-${obligationId}-${month}`,
    obligation_id: obligationId,
    year_id: yearId,
    month,
    planned_amount: Math.round(planned),
    actual_amount: Math.round(actual),
    paid,
    transferred_to_bank: opts.transferred_to_bank,
    transferred_at: opts.transferred_at ?? null,
    notes: opts.notes ?? '',
  };
}

/** Build distribution entries (tithes/offering/first_fruit/savings). */
function buildDistributionEntries(
  obligationId: string,
  year: Year,
  pctField: 'tithes_pct' | 'offering_pct' | 'savings_pct' | 'first_fruit_pct',
  upToMonth: number,
  opts: {
    actualMultiplier?: (month: number) => number; // default 1
    isSavings?: boolean;
    transferredUpTo?: number; // savings only — months 1..N considered transferred
  } = {},
): ObligationEntry[] {
  const entries: ObligationEntry[] = [];
  const mult = opts.actualMultiplier ?? (() => 1);
  for (let m = 1; m <= 12; m++) {
    const income = getIncome(year.year, m);
    const override = findOverride(year.id, m);
    const pct = resolvePct(pctField, year, override);
    const planned = (income * pct) / 100;
    const given = m <= upToMonth;
    const actual = given ? planned * mult(m) : 0;
    const transferred = opts.isSavings ? (m <= (opts.transferredUpTo ?? 0)) : undefined;
    entries.push(
      makeEntry(obligationId, year.id, m, planned, actual, given, {
        transferred_to_bank: transferred,
        transferred_at: transferred ? `${year.year}-${String(m).padStart(2, '0')}-28` : null,
      }),
    );
  }
  return entries;
}

/** Build fixed-amount entries (bills, other). */
function buildFixedEntries(
  obligationId: string,
  yearId: string,
  amount: number,
  upToPaid: number,
): ObligationEntry[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const paid = m <= upToPaid;
    return makeEntry(obligationId, yearId, m, amount, paid ? amount : 0, paid);
  });
}

/** Build loan payment entries. */
function buildLoanEntries(
  obligationId: string,
  yearId: string,
  payment: number,
  upToPaid: number,
): ObligationEntry[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const paid = m <= upToPaid;
    return makeEntry(obligationId, yearId, m, payment, paid ? payment : 0, paid);
  });
}

// ─── Obligation factory ──────────────────────────────────────────────

let _idSeq = 1;
function ob(
  kind: ObligationKind,
  description: string,
  yearId: string,
  partial: Partial<Obligation> = {},
): Obligation {
  const id = `ob-${kind}-${_idSeq++}`;
  return {
    id,
    user_id: 'user-1',
    year_id: yearId,
    kind,
    description,
    frequency: 'Monthly',
    default_amount: null,
    remarks: '',
    entries: [],
    created_at: '2026-01-01',
    updated_at: '2026-04-25',
    ...partial,
  };
}

// ─── 2026 obligations ────────────────────────────────────────────────

const y26 = findYear(2026)!;

// Distributions — one obligation per kind. April offering shows reduced actual via override + multiplier.
const tithes2026 = ob('tithes', 'Monthly Tithe', y26.id, { remarks: '10% of monthly income' });
tithes2026.entries = buildDistributionEntries(tithes2026.id, y26, 'tithes_pct', 4);

const offering2026 = ob('offering', 'Sunday Offering', y26.id, { remarks: '5% of monthly income (3% in April)' });
// April override resolves to 3%; the multiplier is 1 (we gave the full overridden amount).
offering2026.entries = buildDistributionEntries(offering2026.id, y26, 'offering_pct', 4);

const firstFruit2026 = ob('first_fruit', 'First Fruit Offering', y26.id, { remarks: '5% of monthly income' });
firstFruit2026.entries = buildDistributionEntries(firstFruit2026.id, y26, 'first_fruit_pct', 4);

const savings2026 = ob('savings', 'Monthly Savings', y26.id, { remarks: '20% of monthly income — actual counts only after transfer to bank' });
// Saved through April; only Jan & Feb actually transferred to the bank account.
savings2026.entries = buildDistributionEntries(savings2026.id, y26, 'savings_pct', 4, {
  isSavings: true,
  transferredUpTo: 2,
});

// Fixed bills
const bill1 = ob('fixed_bill', 'House Rent', y26.id, { default_amount: 1200, remarks: 'Apartment' });
bill1.entries = buildFixedEntries(bill1.id, y26.id, 1200, 4);
const bill2 = ob('fixed_bill', 'Mobile Subscription', y26.id, { default_amount: 150, remarks: 'Postpaid plan' });
bill2.entries = buildFixedEntries(bill2.id, y26.id, 150, 4);
const bill3 = ob('fixed_bill', 'Internet', y26.id, { default_amount: 200, remarks: 'Fiber 100Mbps' });
bill3.entries = buildFixedEntries(bill3.id, y26.id, 200, 4);
const bill4 = ob('fixed_bill', 'Streaming Services', y26.id, { default_amount: 80, remarks: 'Netflix + Spotify' });
bill4.entries = buildFixedEntries(bill4.id, y26.id, 80, 3);
const bill5 = ob('fixed_bill', 'Insurance', y26.id, { default_amount: 470, frequency: 'Quarterly', remarks: 'Health insurance' });
bill5.entries = buildFixedEntries(bill5.id, y26.id, 470, 1);

// Loans
const loan1 = ob('loan', 'Personal Loan - Dandy', y26.id, {
  default_amount: 1000,
  interest_bearing: true, interest_pct: 5, duration: '24 months',
  loan_amount: 20000, interest_amount: 2000,
});
loan1.entries = buildLoanEntries(loan1.id, y26.id, 1000, 4);

const loan2 = ob('loan', 'Credit Card', y26.id, {
  default_amount: 500,
  interest_bearing: true, interest_pct: 18, duration: '12 months',
  loan_amount: 5000, interest_amount: 900,
});
loan2.entries = buildLoanEntries(loan2.id, y26.id, 500, 4);

const loan3 = ob('loan', 'Family Loan - Brother', y26.id, {
  default_amount: 500,
  interest_bearing: false, interest_pct: 0, duration: '6 months',
  loan_amount: 3000, interest_amount: 0, created_at: '2026-02-01',
});
loan3.entries = buildLoanEntries(loan3.id, y26.id, 500, 3);

// Other obligations
const other1 = ob('other', 'Family Support', y26.id, { default_amount: 2000, remarks: 'Monthly remittance' });
other1.entries = buildFixedEntries(other1.id, y26.id, 2000, 4);
const other2 = ob('other', 'Church Ministry Fund', y26.id, { default_amount: 200, remarks: 'Discretionary support' });
other2.entries = buildFixedEntries(other2.id, y26.id, 200, 3);

export const mockObligations: Obligation[] = [
  tithes2026, offering2026, firstFruit2026, savings2026,
  bill1, bill2, bill3, bill4, bill5,
  loan1, loan2, loan3,
  other1, other2,
];

// ─── Aggregations ────────────────────────────────────────────────────

function sumActualForKind(yearId: string, kind: ObligationKind, month?: number, opts: { savingsRequiresTransfer?: boolean } = {}): number {
  return mockObligations
    .filter((o) => o.year_id === yearId && o.kind === kind)
    .flatMap((o) => o.entries)
    .filter((e) => month == null || e.month === month)
    .filter((e) => {
      if (kind === 'savings' && opts.savingsRequiresTransfer) return e.transferred_to_bank === true;
      return true;
    })
    .reduce((s, e) => s + e.actual_amount, 0);
}

function sumPlannedForKind(yearId: string, kind: ObligationKind, month?: number): number {
  return mockObligations
    .filter((o) => o.year_id === yearId && o.kind === kind)
    .flatMap((o) => o.entries)
    .filter((e) => month == null || e.month === month)
    .reduce((s, e) => s + e.planned_amount, 0);
}

function deriveStatus(income: number, totalActualOut: number): BudgetStatus {
  if (income === 0) return 'at_budget';
  const ratio = totalActualOut / income;
  if (ratio < 0.95) return 'under_budget';
  if (ratio > 1.0) return 'over_budget';
  return 'at_budget';
}

export function getMonthlyBudgets(yearId: string): MonthlyBudget[] {
  const year = mockYears.find((y) => y.id === yearId)!;
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const income = getIncome(year.year, m);

    const tithes_planned = sumPlannedForKind(yearId, 'tithes', m);
    const offering_planned = sumPlannedForKind(yearId, 'offering', m);
    const savings_planned = sumPlannedForKind(yearId, 'savings', m);
    const firstFruit_planned = sumPlannedForKind(yearId, 'first_fruit', m);
    const other_planned = sumPlannedForKind(yearId, 'other', m)
      + sumPlannedForKind(yearId, 'fixed_bill', m)
      + sumPlannedForKind(yearId, 'loan', m);

    const tithes_actual = sumActualForKind(yearId, 'tithes', m);
    const offering_actual = sumActualForKind(yearId, 'offering', m);
    const savings_actual = sumActualForKind(yearId, 'savings', m, { savingsRequiresTransfer: true });
    const firstFruit_actual = sumActualForKind(yearId, 'first_fruit', m);
    const fixed_bills_actual = sumActualForKind(yearId, 'fixed_bill', m);
    const loans_actual = sumActualForKind(yearId, 'loan', m);
    const other_actual = sumActualForKind(yearId, 'other', m);

    const totalOutflow =
      tithes_actual + offering_actual + firstFruit_actual +
      fixed_bills_actual + loans_actual + other_actual + savings_actual;

    return {
      id: `mb-${year.year}-${m}`,
      user_id: 'user-1', year_id: yearId, month: m,
      income_amount: income,
      tithes_planned, offering_planned, savings_planned,
      first_fruit_planned: firstFruit_planned,
      other_planned,
      tithes_actual, offering_actual, savings_actual,
      first_fruit_actual: firstFruit_actual,
      loans_actual, fixed_bills_actual, other_actual,
      status: deriveStatus(income, totalOutflow),
      notes: '',
      created_at: `${year.year}-${String(m).padStart(2, '0')}-01`,
      updated_at: `${year.year}-${String(m).padStart(2, '0')}-28`,
    };
  });
}

export function getDashboardSummary(yearId: string): DashboardSummary {
  const year = mockYears.find((y) => y.id === yearId)!;
  const budgets = getMonthlyBudgets(yearId);

  const monthlyData: MonthlyOverview[] = budgets.map((b) => {
    const expenses = b.fixed_bills_actual + b.loans_actual + b.other_actual;
    const surplus =
      b.income_amount - b.tithes_actual - b.offering_actual -
      b.first_fruit_actual - expenses - b.savings_actual;
    return {
      month: b.month,
      monthName: getMonthName(b.month),
      income: b.income_amount,
      expenses,
      tithes:     { planned: b.tithes_planned,      actual: b.tithes_actual },
      offering:   { planned: b.offering_planned,    actual: b.offering_actual },
      savings:    { planned: b.savings_planned,     actual: b.savings_actual },
      firstFruit: { planned: b.first_fruit_planned, actual: b.first_fruit_actual },
      surplus,
      status: b.status,
    };
  });

  const sumP = (k: keyof Pick<MonthlyOverview, 'tithes' | 'offering' | 'savings' | 'firstFruit'>) =>
    monthlyData.reduce((s, m) => s + m[k].planned, 0);
  const sumA = (k: keyof Pick<MonthlyOverview, 'tithes' | 'offering' | 'savings' | 'firstFruit'>) =>
    monthlyData.reduce((s, m) => s + m[k].actual, 0);

  return {
    year: year.year,
    totalIncome: monthlyData.reduce((s, m) => s + m.income, 0),
    totalExpenses: monthlyData.reduce((s, m) => s + m.expenses, 0),
    tithes:     { planned: sumP('tithes'),     actual: sumA('tithes') },
    offering:   { planned: sumP('offering'),   actual: sumA('offering') },
    savings:    { planned: sumP('savings'),    actual: sumA('savings') },
    firstFruit: { planned: sumP('firstFruit'), actual: sumA('firstFruit') },
    surplus: monthlyData.reduce((s, m) => s + m.surplus, 0),
    monthlyData,
  };
}

// ─── Status helpers (used by Dashboard/Budget) ───────────────────────

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

// re-export for convenience
export { mockYears, mockYearMonthOverrides };
