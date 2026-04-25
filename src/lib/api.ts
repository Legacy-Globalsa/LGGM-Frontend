/**
 * Thin API abstraction — currently returns mock data via Promises.
 * To swap to real backend, replace each function body with a fetch() call.
 */
import { mockTransactions } from '@/mocks/mockTransactions';
import { mockBudgets, mockYear, getMockDashboardSummary } from '@/mocks/mockBudget';
import { mockBills } from '@/mocks/mockBills';
import { mockLoans } from '@/mocks/mockLoans';
import { mockCategories } from '@/mocks/mockCategories';
import type {
  Transaction, MonthlyBudget, FixedMonthlyBill,
  Loan, Category, Year, DashboardSummary,
} from '@/types';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ─── Dashboard ───────────────────────────────────────────────────────
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  await delay();
  return getMockDashboardSummary();
}

// ─── Transactions ────────────────────────────────────────────────────
export async function fetchTransactions(month?: number): Promise<Transaction[]> {
  await delay();
  if (month) return mockTransactions.filter((t) => t.month === month);
  return mockTransactions;
}

export async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  await delay(200);
  const newTxn: Transaction = {
    id: `txn-${Date.now()}`, user_id: 'user-1', year_id: 'year-1',
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
  await delay(200);
  const idx = mockTransactions.findIndex((t) => t.id === id);
  if (idx !== -1) mockTransactions.splice(idx, 1);
}

// ─── Budget ──────────────────────────────────────────────────────────
export async function fetchBudgets(): Promise<MonthlyBudget[]> {
  await delay();
  return mockBudgets;
}

export async function fetchYear(): Promise<Year> {
  await delay(100);
  return mockYear;
}

// ─── Bills ───────────────────────────────────────────────────────────
export async function fetchBills(): Promise<FixedMonthlyBill[]> {
  await delay();
  return mockBills;
}

export async function createBill(data: Partial<FixedMonthlyBill>): Promise<FixedMonthlyBill> {
  await delay(200);
  const bill: FixedMonthlyBill = {
    id: `bill-${Date.now()}`, user_id: 'user-1', year_id: 'year-1',
    description: data.description ?? '', frequency: data.frequency ?? 'Monthly',
    amount: data.amount ?? 0, remarks: data.remarks ?? '',
    payments: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  mockBills.push(bill);
  return bill;
}

// ─── Loans ───────────────────────────────────────────────────────────
export async function fetchLoans(): Promise<Loan[]> {
  await delay();
  return mockLoans;
}

export async function createLoan(data: Partial<Loan>): Promise<Loan> {
  await delay(200);
  const loan: Loan = {
    id: `loan-${Date.now()}`, user_id: 'user-1', year_id: 'year-1',
    description: data.description ?? '', interest_bearing: data.interest_bearing ?? false,
    interest_pct: data.interest_pct ?? 0, duration: data.duration ?? '',
    loan_amount: data.loan_amount ?? 0, interest_amount: data.interest_amount ?? 0,
    payments: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  mockLoans.push(loan);
  return loan;
}

// ─── Categories ──────────────────────────────────────────────────────
export async function fetchCategories(): Promise<Category[]> {
  await delay(100);
  return mockCategories;
}
