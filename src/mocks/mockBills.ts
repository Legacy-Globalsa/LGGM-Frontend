import type { FixedMonthlyBill, BillPayment } from '@/types';

function payment(billId: string, month: number, amount: number, paid: boolean): BillPayment {
  return { id: `bp-${billId}-${month}`, bill_id: billId, month, amount, paid };
}

function paidMonths(billId: string, amount: number, upTo: number): BillPayment[] {
  return Array.from({ length: 12 }, (_, i) =>
    payment(billId, i + 1, amount, i + 1 <= upTo)
  );
}

export const mockBills: FixedMonthlyBill[] = [
  { id: 'bill-1', user_id: 'user-1', year_id: 'year-1', description: 'House Rent', frequency: 'Monthly', amount: 1200, remarks: 'Apartment', payments: paidMonths('bill-1', 1200, 4), created_at: '2026-01-01', updated_at: '2026-04-25' },
  { id: 'bill-2', user_id: 'user-1', year_id: 'year-1', description: 'Mobile Subscription', frequency: 'Monthly', amount: 150, remarks: 'Postpaid plan', payments: paidMonths('bill-2', 150, 4), created_at: '2026-01-01', updated_at: '2026-04-25' },
  { id: 'bill-3', user_id: 'user-1', year_id: 'year-1', description: 'Internet', frequency: 'Monthly', amount: 200, remarks: 'Fiber 100Mbps', payments: paidMonths('bill-3', 200, 4), created_at: '2026-01-01', updated_at: '2026-04-25' },
  { id: 'bill-4', user_id: 'user-1', year_id: 'year-1', description: 'Streaming Services', frequency: 'Monthly', amount: 80, remarks: 'Netflix + Spotify', payments: paidMonths('bill-4', 80, 3), created_at: '2026-01-01', updated_at: '2026-04-25' },
  { id: 'bill-5', user_id: 'user-1', year_id: 'year-1', description: 'Insurance', frequency: 'Quarterly', amount: 470, remarks: 'Health insurance', payments: paidMonths('bill-5', 470, 1), created_at: '2026-01-01', updated_at: '2026-04-25' },
];
