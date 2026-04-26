import type { Year, YearMonthOverride } from '@/types';

export const mockYears: Year[] = [
  {
    id: 'year-2026', user_id: 'user-1', year: 2026, is_active: true,
    tithes_pct: 10, offering_pct: 5, savings_pct: 20,
    first_fruit_pct: 5, other_expenses_pct: 60,
    created_at: '2026-01-01', updated_at: '2026-04-01',
  },
  {
    id: 'year-2025', user_id: 'user-1', year: 2025, is_active: false,
    tithes_pct: 10, offering_pct: 5, savings_pct: 15,
    first_fruit_pct: 5, other_expenses_pct: 65,
    created_at: '2025-01-01', updated_at: '2025-12-31',
  },
];

/** Per-month percentage overrides. Anything null = falls back to year defaults. */
export const mockYearMonthOverrides: YearMonthOverride[] = [
  // April 2026: gave only 3% offering instead of the 5% default
  {
    id: 'ovr-2026-4', user_id: 'user-1', year_id: 'year-2026', month: 4,
    tithes_pct: null, offering_pct: 3, savings_pct: null, first_fruit_pct: null,
    other_expenses_pct: null,
    notes: 'Reduced offering this month — tighter budget.',
  },
  // June 2026: bumped savings to 25%
  {
    id: 'ovr-2026-6', user_id: 'user-1', year_id: 'year-2026', month: 6,
    tithes_pct: null, offering_pct: null, savings_pct: 25, first_fruit_pct: null,
    other_expenses_pct: null,
    notes: 'Boosted savings allocation.',
  },
];

export function findYear(yearNumber: number): Year | undefined {
  return mockYears.find((y) => y.year === yearNumber);
}

export function findActiveYear(): Year {
  return mockYears.find((y) => y.is_active) ?? mockYears[0];
}

export function findOverride(yearId: string, month: number): YearMonthOverride | undefined {
  return mockYearMonthOverrides.find((o) => o.year_id === yearId && o.month === month);
}
