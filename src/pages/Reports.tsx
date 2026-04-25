import { useEffect, useState, useMemo } from 'react';
import { FileBarChart, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchTransactions, fetchBudgets } from '@/lib/api';
import { getMonthName, MONTHS } from '@/types';
import type { Transaction, MonthlyBudget } from '@/types';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'category'>('yearly');
  const [selectedMonth, setSelectedMonth] = useState('0'); // 0 = all

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchBudgets()]).then(([t, b]) => {
      setTransactions(t); setBudgets(b); setLoading(false);
    });
  }, []);

  const monthNum = parseInt(selectedMonth);

  const categoryBreakdown = useMemo(() => {
    const filtered = monthNum > 0 ? transactions.filter((t) => t.month === monthNum) : transactions;
    const map = new Map<string, { name: string; income: number; expense: number }>();
    filtered.forEach((t) => {
      const key = t.category_name ?? 'Unknown';
      const existing = map.get(key) ?? { name: key, income: 0, expense: 0 };
      if (t.type === 'income') existing.income += t.amount;
      else existing.expense += t.amount;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [transactions, monthNum]);

  const monthlyChart = useMemo(() => {
    return budgets.map((b) => ({
      name: getMonthName(b.month).slice(0, 3),
      income: b.income_amount,
      expenses: b.loans_payment + b.fixed_bills + b.other_expenses_amount,
    }));
  }, [budgets]);

  const exportCSV = () => {
    const filtered = monthNum > 0 ? transactions.filter((t) => t.month === monthNum) : transactions;
    const rows = [['Date', 'Description', 'Type', 'Category', 'Amount', 'Notes']];
    filtered.forEach((t) => rows.push([t.transaction_date, t.description, t.type, t.category_name ?? '', String(t.amount), t.notes]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lggm-report-${monthNum > 0 ? getMonthName(monthNum) : 'yearly'}-2026.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  const filteredTxns = monthNum > 0 ? transactions.filter((t) => t.month === monthNum) : transactions;
  const totalIncome = filteredTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial summaries and exports</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
          <SelectTrigger className="w-[160px]"><FileBarChart className="mr-2 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yearly">Yearly Overview</SelectItem>
            <SelectItem value="monthly">Monthly Detail</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px]"><Calendar className="mr-2 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All Months</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Income</p><p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalIncome)}</p></CardContent></Card>
        <Card className="border-rose-500/20 bg-rose-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-xl font-bold text-rose-600 dark:text-rose-400">{fmt(totalExpense)}</p></CardContent></Card>
        <Card className="border-violet-500/20 bg-violet-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net</p><p className="text-xl font-bold text-violet-600 dark:text-violet-400">{fmt(totalIncome - totalExpense)}</p></CardContent></Card>
      </div>

      {/* Chart */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
              <Tooltip formatter={(val: number) => fmt(val)} />
              <Bar dataKey="income" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Table */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryBreakdown.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{fmt(c.income)}</TableCell>
                  <TableCell className="text-right text-rose-600 dark:text-rose-400">{fmt(c.expense)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(c.income - c.expense)}</TableCell>
                </TableRow>
              ))}
              {categoryBreakdown.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No data for selected period</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
