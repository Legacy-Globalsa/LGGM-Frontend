/**
 * Thin API abstraction — currently returns mock data via Promises.
 * To swap to real backend, replace each function body with a fetch() call.
 */
import { mockTransactions } from '@/mocks/mockTransactions';
import { mockCategories } from '@/mocks/mockCategories';
import {
  mockObligations, getMonthlyBudgets, getDashboardSummary,
} from '@/mocks/mockObligations';
import {
  mockYears, mockYearMonthOverrides, findYear, findActiveYear,
} from '@/mocks/mockYears';
import type {
  Transaction, MonthlyBudget, Obligation, ObligationKind, ObligationEntry,
  Category, Year, YearMonthOverride, DashboardSummary, TransactionMonthAggregate,
} from '@/types';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function resolveYearId(yearNumber: number): string {
  return findYear(yearNumber)?.id ?? findActiveYear().id;
}

// ─── Years & overrides ───────────────────────────────────────────────

export async function fetchYears(): Promise<Year[]> {
  await delay(80);
  return mockYears;
}

export async function fetchYear(yearNumber?: number): Promise<Year> {
  await delay(80);
  if (yearNumber == null) return findActiveYear();
  return findYear(yearNumber) ?? findActiveYear();
}

export async function updateYear(yearId: string, patch: Partial<Year>): Promise<Year> {
  await delay(120);
  const idx = mockYears.findIndex((y) => y.id === yearId);
  if (idx === -1) throw new Error('Year not found');
  mockYears[idx] = { ...mockYears[idx], ...patch, updated_at: new Date().toISOString() };
  return mockYears[idx];
}

export async function fetchYearOverrides(yearId: string): Promise<YearMonthOverride[]> {
  await delay(80);
  return mockYearMonthOverrides.filter((o) => o.year_id === yearId);
}

export async function upsertYearOverride(
  yearId: string,
  month: number,
  patch: Partial<Omit<YearMonthOverride, 'id' | 'year_id' | 'month' | 'user_id'>>,
): Promise<YearMonthOverride> {
  await delay(120);
  const existing = mockYearMonthOverrides.find((o) => o.year_id === yearId && o.month === month);
  if (existing) {
    Object.assign(existing, patch);
    return existing;
  }
  const created: YearMonthOverride = {
    id: `ovr-${yearId}-${month}-${Date.now()}`,
    user_id: 'user-1', year_id: yearId, month,
    tithes_pct: null, offering_pct: null, savings_pct: null,
    first_fruit_pct: null, other_expenses_pct: null,
    notes: '',
    ...patch,
  };
  mockYearMonthOverrides.push(created);
  return created;
}

// ─── Dashboard ───────────────────────────────────────────────────────

export async function fetchDashboardSummary(yearNumber: number): Promise<DashboardSummary> {
  await delay();
  return getDashboardSummary(resolveYearId(yearNumber));
}

// ─── Transactions ────────────────────────────────────────────────────

export async function fetchTransactions(yearNumber: number, month?: number): Promise<Transaction[]> {
  await delay();
  const yearId = resolveYearId(yearNumber);
  return mockTransactions
    .filter((t) => t.year_id === yearId || yearId === 'year-2026') // mock data lives in 2026
    .filter((t) => month == null || t.month === month);
}

export async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  await delay(150);
  const newTxn: Transaction = {
    id: `txn-${Date.now()}`, user_id: 'user-1', year_id: data.year_id ?? 'year-2026',
    month: data.month ?? 1, transaction_date: data.transaction_date ?? new Date().toISOString().split('T')[0],
    description: data.description ?? '', type: data.type ?? 'expense',
    category_id: data.category_id ?? '', category_name: data.category_name,
    amount: data.amount ?? 0, status: data.status ?? 'completed',
    notes: data.notes ?? '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  mockTransactions.push(newTxn);
  return newTxn;
}

export async function deleteTransaction(id: string): Promise<void> {
  await delay(150);
  const idx = mockTransactions.findIndex((t) => t.id === id);
  if (idx !== -1) mockTransactions.splice(idx, 1);
}

/**
 * Aggregate transactions by month for a given year.
 * Returns income and expense totals per month (source of truth for
 * MonthlyBudget.income_amount and other_actual — Option C data model).
 */
export async function fetchTransactionAggregates(
  yearNumber: number,
): Promise<TransactionMonthAggregate[]> {
  await delay(80);
  const yearId = resolveYearId(yearNumber);
  const txns = mockTransactions.filter(
    (t) => t.year_id === yearId || yearId === 'year-2026',
  );
  const map = new Map<number, TransactionMonthAggregate>();
  for (const t of txns) {
    if (!map.has(t.month)) map.set(t.month, { month: t.month, income: 0, expenses: 0 });
    const agg = map.get(t.month)!;
    if (t.type === 'income') agg.income += t.amount;
    else agg.expenses += t.amount;
  }
  return Array.from(map.values()).sort((a, b) => a.month - b.month);
}

// ─── Budget ──────────────────────────────────────────────────────────

export async function fetchBudgets(yearNumber: number): Promise<MonthlyBudget[]> {
  await delay();
  const budgets = getMonthlyBudgets(resolveYearId(yearNumber));
  // Option C: income_amount and other_actual are driven by transaction aggregates.
  const aggregates = await fetchTransactionAggregates(yearNumber);
  const aggByMonth = new Map(aggregates.map((a) => [a.month, a]));
  return budgets.map((b) => {
    const agg = aggByMonth.get(b.month);
    if (!agg) return b;
    const income = agg.income > 0 ? agg.income : b.income_amount;
    return {
      ...b,
      income_amount: income,
      other_actual: agg.expenses,
    };
  });
}

// ─── Obligations (unified) ───────────────────────────────────────────

export async function fetchObligations(yearNumber: number, kind?: ObligationKind): Promise<Obligation[]> {
  await delay();
  const yearId = resolveYearId(yearNumber);
  return mockObligations
    .filter((o) => o.year_id === yearId)
    .filter((o) => !kind || o.kind === kind);
}

export async function createObligation(data: Partial<Obligation> & { kind: ObligationKind }): Promise<Obligation> {
  await delay(150);
  const created: Obligation = {
    id: `ob-${Date.now()}`, user_id: 'user-1',
    year_id: data.year_id ?? findActiveYear().id,
    kind: data.kind,
    description: data.description ?? '',
    frequency: data.frequency ?? 'Monthly',
    default_amount: data.default_amount ?? null,
    remarks: data.remarks ?? '',
    interest_bearing: data.interest_bearing,
    interest_pct: data.interest_pct,
    duration: data.duration,
    loan_amount: data.loan_amount,
    interest_amount: data.interest_amount,
    entries: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockObligations.push(created);
  return created;
}

export async function updateObligationEntry(
  obligationId: string, month: number, patch: Partial<ObligationEntry>,
): Promise<ObligationEntry> {
  await delay(120);
  const ob = mockObligations.find((o) => o.id === obligationId);
  if (!ob) throw new Error('Obligation not found');
  let entry = ob.entries.find((e) => e.month === month);
  if (!entry) {
    entry = {
      id: `oe-${obligationId}-${month}`, obligation_id: obligationId,
      year_id: ob.year_id, month,
      planned_amount: 0, actual_amount: 0, paid: false, notes: '',
    };
    ob.entries.push(entry);
  }
  Object.assign(entry, patch);
  return entry;
}

/** Mark a savings entry as transferred to a bank account. */
export async function markSavingsTransferred(
  obligationId: string, month: number, transferred: boolean,
): Promise<ObligationEntry> {
  return updateObligationEntry(obligationId, month, {
    transferred_to_bank: transferred,
    transferred_at: transferred ? new Date().toISOString() : null,
  });
}

// ─── Categories ──────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  await delay(80);
  return mockCategories;
}
