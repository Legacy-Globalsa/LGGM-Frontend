import type { Category } from '@/types';

export const mockCategories: Category[] = [
  // Income categories
  { id: 'cat-1', user_id: 'user-1', name: 'Salary', type: 'income', created_at: '2026-01-01' },
  { id: 'cat-2', user_id: 'user-1', name: 'Part-time Job', type: 'income', created_at: '2026-01-01' },
  { id: 'cat-3', user_id: 'user-1', name: 'Freelance', type: 'income', created_at: '2026-01-01' },
  { id: 'cat-4', user_id: 'user-1', name: 'Business Income', type: 'income', created_at: '2026-01-01' },
  { id: 'cat-5', user_id: 'user-1', name: 'Other Income', type: 'income', created_at: '2026-01-01' },
  // Expense categories
  { id: 'cat-10', user_id: 'user-1', name: 'Food & Groceries', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-11', user_id: 'user-1', name: 'Transportation', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-12', user_id: 'user-1', name: 'Utilities', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-13', user_id: 'user-1', name: 'Family Support', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-14', user_id: 'user-1', name: 'Personal', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-15', user_id: 'user-1', name: 'Church Ministry', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-16', user_id: 'user-1', name: 'Medical', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-17', user_id: 'user-1', name: 'Education', type: 'expense', created_at: '2026-01-01' },
  { id: 'cat-18', user_id: 'user-1', name: 'Miscellaneous', type: 'expense', created_at: '2026-01-01' },
];

export function getCategoryName(categoryId: string): string {
  return mockCategories.find((c) => c.id === categoryId)?.name ?? 'Unknown';
}
