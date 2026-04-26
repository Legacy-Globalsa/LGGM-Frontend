import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTransactions, fetchBudgets } from '@/lib/api';
import type { Transaction, MonthlyBudget } from '@/types';
import { MONTH_SHORT } from '@/types';
import { useYear } from '@/hooks/useYear';
import { useCurrency } from '@/hooks/useCurrency';

const COLORS = ['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#a855f7'];

export default function Reports() {
  const { selectedYear } = useYear();
  const { formatCurrency: fmt } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTransactions(selectedYear), fetchBudgets(selectedYear)]).then(([t, b]) => {
      setTransactions(t); setBudgets(b); setLoading(false);
    });
  }, [selectedYear]);

  const totals = useMemo(() => {
    const income = budgets.reduce((s, b) => s + b.income_amount, 0);
    const expenses = budgets.reduce(
      (s, b) => s + b.fixed_bills_actual + b.loans_actual + b.other_actual,
      0,
    );
    const givenToLord = budgets.reduce(
      (s, b) => s + b.tithes_actual + b.offering_actual + b.first_fruit_actual,
      0,
    );
    const savedToBank = budgets.reduce((s, b) => s + b.savings_actual, 0);
    return { income, expenses, givenToLord, savedToBank };
  }, [budgets]);

  const monthlyData = useMemo(
    () => budgets.map((b) => ({
      month: MONTH_SHORT[b.month - 1],
      income: b.income_amount,
      expenses: b.fixed_bills_actual + b.loans_actual + b.other_actual,
      given: b.tithes_actual + b.offering_actual + b.first_fruit_actual,
      saved: b.savings_actual,
    })),
    [budgets],
  );

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const name = t.category_name ?? 'Other';
        map.set(name, (map.get(name) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [transactions]);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
        <p className="text-sm text-muted-foreground">Year-end overview for {selectedYear}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi icon={TrendingUp} label="Total Income" value={fmt(totals.income)} accent="emerald" />
        <Kpi icon={TrendingDown} label="Total Expenses" value={fmt(totals.expenses)} accent="rose" />
        <Kpi icon={Wallet} label="Given to the Lord" value={fmt(totals.givenToLord)} accent="violet" />
        <Kpi icon={PiggyBank} label="Saved to Bank" value={fmt(totals.savedToBank)} accent="indigo" />
      </div>

      {/* Monthly stacked */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Monthly Cash Flow</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income"   name="Income"          fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses"        fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="given"    name="Given to Lord"   fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saved"    name="Saved to Bank"   fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category pie */}
      {categoryData.length > 0 && (
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">Top Expense Categories</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={(e) => e.name}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, accent,
}: {
  icon: typeof TrendingUp; label: string; value: string;
  accent: 'emerald' | 'rose' | 'violet' | 'indigo';
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
    violet: 'text-violet-500',
    indigo: 'text-indigo-500',
  };
  return (
    <Card className="border-border/40">
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-8 w-8 ${colors[accent]}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
