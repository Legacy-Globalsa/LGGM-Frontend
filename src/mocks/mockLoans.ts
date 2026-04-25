import type { Loan, LoanPayment } from '@/types';

function lp(loanId: string, month: number, amount: number): LoanPayment {
  return { id: `lp-${loanId}-${month}`, loan_id: loanId, month, amount };
}

function payments(loanId: string, amount: number, upTo: number): LoanPayment[] {
  return Array.from({ length: upTo }, (_, i) => lp(loanId, i + 1, amount));
}

export const mockLoans: Loan[] = [
  {
    id: 'loan-1', user_id: 'user-1', year_id: 'year-1',
    description: 'Personal Loan - Dandy', interest_bearing: true,
    interest_pct: 5, duration: '24 months', loan_amount: 20000,
    interest_amount: 2000, payments: payments('loan-1', 1000, 4),
    created_at: '2026-01-01', updated_at: '2026-04-25',
  },
  {
    id: 'loan-2', user_id: 'user-1', year_id: 'year-1',
    description: 'Credit Card', interest_bearing: true,
    interest_pct: 18, duration: '12 months', loan_amount: 5000,
    interest_amount: 900, payments: payments('loan-2', 500, 4),
    created_at: '2026-01-01', updated_at: '2026-04-25',
  },
  {
    id: 'loan-3', user_id: 'user-1', year_id: 'year-1',
    description: 'Family Loan - Brother', interest_bearing: false,
    interest_pct: 0, duration: '6 months', loan_amount: 3000,
    interest_amount: 0, payments: payments('loan-3', 500, 3),
    created_at: '2026-02-01', updated_at: '2026-04-25',
  },
];
