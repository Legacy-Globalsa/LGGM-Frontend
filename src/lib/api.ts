/**
 * API layer — all calls go to the Express backend.
 * The Authorization header is populated from the active Supabase session.
 */
import { supabase } from '@/lib/supabase';
import type {
  Transaction, MonthlyBudget, Obligation, ObligationKind, ObligationEntry,
  Category, Year, YearMonthOverride, DashboardSummary, MonthlyOverview,
  TransactionMonthAggregate, MoneyAccount,
} from '@/types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Auth helper ─────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = body?.message ?? body?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return body as T;
}

// ─── Years & overrides ───────────────────────────────────────────────

export async function fetchYears(): Promise<Year[]> {
  return apiFetch<Year[]>('/api/years');
}

export async function fetchYear(yearNumber?: number): Promise<Year> {
  const years = await fetchYears();
  if (!years.length) throw new Error('No years found. Please create a year in Settings.');
  if (yearNumber != null) {
    return years.find((y) => y.year === yearNumber) ?? years[0];
  }
  return years.find((y) => y.is_active) ?? years[0];
}

export async function createYear(data: Partial<Year>): Promise<Year> {
  return apiFetch<Year>('/api/years', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateYear(yearId: string, patch: Partial<Year>): Promise<Year> {
  return apiFetch<Year>(`/api/years/${yearId}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function activateYear(yearId: string): Promise<Year> {
  return apiFetch<Year>(`/api/years/${yearId}/activate`, { method: 'PUT' });
}

export async function fetchYearOverrides(yearId: string): Promise<YearMonthOverride[]> {
  return apiFetch<YearMonthOverride[]>(`/api/years/${yearId}/overrides`);
}

export async function upsertYearOverride(
  yearId: string,
  month: number,
  patch: Partial<Omit<YearMonthOverride, 'id' | 'year_id' | 'month' | 'user_id'>>,
): Promise<YearMonthOverride> {
  return apiFetch<YearMonthOverride>(`/api/years/${yearId}/overrides`, {
    method: 'POST',
    body: JSON.stringify({ month, ...patch }),
  });
}

export async function removeYearOverride(yearId: string, month: number): Promise<void> {
  return apiFetch<void>(`/api/years/${yearId}/overrides/${month}`, { method: 'DELETE' });
}

// ─── Dashboard ───────────────────────────────────────────────────────

export async function fetchDashboardSummary(yearNumber: number): Promise<DashboardSummary> {
  const year = await fetchYear(yearNumber);
  const budgets = await fetchBudgets(year.id);

  const monthlyData: MonthlyOverview[] = budgets.map((b) => ({
    month: b.month,
    monthName: MONTH_NAMES[b.month - 1] ?? '',
    income: Number(b.income_amount),
    expenses: Number(b.other_actual),
    tithes:     { planned: Number(b.tithes_planned),      actual: Number(b.tithes_actual) },
    offering:   { planned: Number(b.offering_planned),    actual: Number(b.offering_actual) },
    savings:    { planned: Number(b.savings_planned),     actual: Number(b.savings_actual) },
    firstFruit: { planned: Number(b.first_fruit_planned), actual: Number(b.first_fruit_actual) },
    surplus: Number(b.income_amount) - Number(b.other_actual),
    status: b.status,
  }));

  const totalIncome   = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);

  const tithes     = monthlyData.reduce(
    (acc, m) => ({ planned: acc.planned + m.tithes.planned,     actual: acc.actual + m.tithes.actual }),
    { planned: 0, actual: 0 },
  );
  const offering   = monthlyData.reduce(
    (acc, m) => ({ planned: acc.planned + m.offering.planned,   actual: acc.actual + m.offering.actual }),
    { planned: 0, actual: 0 },
  );
  const savings    = monthlyData.reduce(
    (acc, m) => ({ planned: acc.planned + m.savings.planned,    actual: acc.actual + m.savings.actual }),
    { planned: 0, actual: 0 },
  );
  const firstFruit = monthlyData.reduce(
    (acc, m) => ({ planned: acc.planned + m.firstFruit.planned, actual: acc.actual + m.firstFruit.actual }),
    { planned: 0, actual: 0 },
  );

  return {
    year: yearNumber,
    totalIncome,
    totalExpenses,
    tithes,
    offering,
    savings,
    firstFruit,
    surplus: totalIncome - totalExpenses,
    monthlyData,
  };
}

// ─── Transactions ─────────────────────────────────────────────────────
// yearId is the UUID from the years table.

export async function fetchTransactions(yearId: string, month?: number): Promise<Transaction[]> {
  const params = new URLSearchParams({ year_id: yearId });
  if (month != null) params.set('month', String(month));
  return apiFetch<Transaction[]>(`/api/transactions?${params}`);
}

export async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  return apiFetch<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction> {
  return apiFetch<Transaction>(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return apiFetch<void>(`/api/transactions/${id}`, { method: 'DELETE' });
}

export async function fetchTransactionAggregates(yearId: string): Promise<TransactionMonthAggregate[]> {
  const txns = await fetchTransactions(yearId);
  const map = new Map<number, TransactionMonthAggregate>();
  for (const t of txns) {
    if (!map.has(t.month)) map.set(t.month, { month: t.month, income: 0, expenses: 0 });
    const agg = map.get(t.month)!;
    if (t.type === 'income') agg.income += Number(t.amount);
    else agg.expenses += Number(t.amount);
  }
  return Array.from(map.values()).sort((a, b) => a.month - b.month);
}

// ─── Budget ───────────────────────────────────────────────────────────
// yearId is the UUID from the years table.

export async function fetchBudgets(yearId: string): Promise<MonthlyBudget[]> {
  return apiFetch<MonthlyBudget[]>(`/api/budget?year_id=${yearId}`);
}

export async function recalculateBudget(yearId: string): Promise<MonthlyBudget[]> {
  return apiFetch<MonthlyBudget[]>('/api/budget', {
    method: 'POST',
    body: JSON.stringify({ year_id: yearId }),
  });
}

// ─── Obligations (unified) ────────────────────────────────────────────
// yearNumber is the calendar year (e.g. 2026); resolved to yearId internally.

export async function fetchObligations(yearNumber: number, kind?: ObligationKind): Promise<Obligation[]> {
  const year = await fetchYear(yearNumber);
  const params = new URLSearchParams({ year_id: year.id });
  if (kind) params.set('kind', kind);
  return apiFetch<Obligation[]>(`/api/obligations?${params}`);
}

export async function createObligation(data: Partial<Obligation> & { kind: ObligationKind }): Promise<Obligation> {
  return apiFetch<Obligation>('/api/obligations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateObligation(id: string, patch: Partial<Obligation>): Promise<Obligation> {
  return apiFetch<Obligation>(`/api/obligations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteObligation(id: string): Promise<void> {
  return apiFetch<void>(`/api/obligations/${id}`, { method: 'DELETE' });
}

export async function updateObligationEntry(
  obligationId: string, yearId: string, month: number, patch: Partial<ObligationEntry>,
): Promise<ObligationEntry> {
  return apiFetch<ObligationEntry>(`/api/obligations/${obligationId}/entries`, {
    method: 'POST',
    body: JSON.stringify({ year_id: yearId, month, ...patch }),
  });
}

export async function patchObligationEntry(
  obligationId: string, entryId: string, patch: Partial<ObligationEntry>,
): Promise<ObligationEntry> {
  return apiFetch<ObligationEntry>(`/api/obligations/${obligationId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

/** Mark a savings entry as transferred to a money account. */
export async function markSavingsTransferred(
  obligationId: string, yearId: string, month: number, transferred: boolean, accountId?: string,
): Promise<ObligationEntry> {
  return updateObligationEntry(obligationId, yearId, month, {
    transferred_to_bank: transferred,
    transferred_at: transferred ? new Date().toISOString() : null,
    transferred_to_account: transferred ? (accountId ?? undefined) : null,
  });
}

// ─── Categories ───────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories');
}

/** Seeds default income/expense categories for the user if none exist yet. Returns the full list. */
export async function seedDefaultCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories/seed-defaults', { method: 'POST' });
}

export async function createCategory(data: Pick<Category, 'name' | 'type'>): Promise<Category> {
  return apiFetch<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/api/categories/${id}`, { method: 'DELETE' });
}

// ─── Money Accounts ───────────────────────────────────────────────────

export async function fetchMoneyAccounts(): Promise<MoneyAccount[]> {
  return apiFetch<MoneyAccount[]>('/api/money-accounts');
}

export async function createMoneyAccount(
  data: Partial<Omit<MoneyAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<MoneyAccount> {
  return apiFetch<MoneyAccount>('/api/money-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMoneyAccount(id: string, patch: Partial<MoneyAccount>): Promise<MoneyAccount> {
  return apiFetch<MoneyAccount>(`/api/money-accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteMoneyAccount(id: string): Promise<void> {
  return apiFetch<void>(`/api/money-accounts/${id}`, { method: 'DELETE' });
}

// ─── Reports ──────────────────────────────────────────────────────────

export async function fetchMonthlyReport(yearId: string, month: number) {
  return apiFetch(`/api/reports/monthly?year_id=${yearId}&month=${month}`);
}

export async function fetchYearlyReport(yearId: string) {
  return apiFetch(`/api/reports/yearly?year_id=${yearId}`);
}

export async function fetchCategoryReport(yearId: string, month?: number) {
  const params = new URLSearchParams({ year_id: yearId });
  if (month != null) params.set('month', String(month));
  return apiFetch(`/api/reports/categories?${params}`);
}

export function buildCsvExportUrl(yearId: string, month?: number): string {
  const params = new URLSearchParams({ year_id: yearId });
  if (month != null) params.set('month', String(month));
  return `${BASE}/api/reports/export/csv?${params}`;
}
