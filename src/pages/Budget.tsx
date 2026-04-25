import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { fetchBudgets, fetchYear } from '@/lib/api';
import { getStatusColor, getStatusLabel } from '@/mocks/mockBudget';
import { getMonthName } from '@/types';
import type { MonthlyBudget, Year } from '@/types';
import { cn } from '@/lib/utils';
import { Scale, TrendingUp, TrendingDown, Percent } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default function Budget() {
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [year, setYear] = useState<Year | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBudgets(), fetchYear()]).then(([b, y]) => { setBudgets(b); setYear(y); setLoading(false); });
  }, []);

  if (loading || !year) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  const totalIncome = budgets.reduce((s, b) => s + b.income_amount, 0);
  const totalExpenses = budgets.reduce((s, b) => s + b.loans_payment + b.fixed_bills + b.other_expenses_amount, 0);
  const underCount = budgets.filter((b) => b.status === 'under_budget').length;
  const overCount = budgets.filter((b) => b.status === 'over_budget').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Budget vs Actual</h1>
        <p className="text-sm text-muted-foreground">Compare planned vs actual for {year.year}</p>
      </div>

      {/* Year Config Card */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4 text-violet-500" /> Distribution Percentages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-5">
            {[
              { label: 'Tithes', value: year.tithes_pct },
              { label: 'Offering', value: year.offering_pct },
              { label: 'Savings', value: year.savings_pct },
              { label: 'First Fruit', value: year.first_fruit_pct },
              { label: 'Other Expenses', value: year.other_expenses_pct },
            ].map((d) => (
              <div key={d.label} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{d.label}</Label>
                <Input value={`${d.value}%`} readOnly className="bg-muted/30 text-center font-semibold" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><Scale className="h-8 w-8 text-violet-500" /><div><p className="text-xs text-muted-foreground">Total Budget</p><p className="text-lg font-bold">{fmt(totalIncome)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingDown className="h-8 w-8 text-rose-500" /><div><p className="text-xs text-muted-foreground">Total Actual</p><p className="text-lg font-bold">{fmt(totalExpenses)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingUp className="h-8 w-8 text-emerald-500" /><div><p className="text-xs text-muted-foreground">Under Budget</p><p className="text-lg font-bold text-emerald-600">{underCount} months</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingDown className="h-8 w-8 text-rose-500" /><div><p className="text-xs text-muted-foreground">Over Budget</p><p className="text-lg font-bold text-rose-600">{overCount} months</p></div></CardContent></Card>
      </div>

      {/* Budget Table */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Monthly Breakdown</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Tithes</TableHead>
                <TableHead className="text-right">Offering</TableHead>
                <TableHead className="text-right">Savings</TableHead>
                <TableHead className="text-right">First Fruit</TableHead>
                <TableHead className="text-right">Fixed Bills</TableHead>
                <TableHead className="text-right">Loans</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{getMonthName(b.month)}</TableCell>
                  <TableCell className="text-right">{fmt(b.income_amount)}</TableCell>
                  <TableCell className="text-right">{fmt(b.tithes)}</TableCell>
                  <TableCell className="text-right">{fmt(b.offering)}</TableCell>
                  <TableCell className="text-right">{fmt(b.savings)}</TableCell>
                  <TableCell className="text-right">{fmt(b.first_fruit)}</TableCell>
                  <TableCell className="text-right">{fmt(b.fixed_bills)}</TableCell>
                  <TableCell className="text-right">{fmt(b.loans_payment)}</TableCell>
                  <TableCell className="text-right">{fmt(b.other_expenses_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-[10px]', getStatusColor(b.status))}>{getStatusLabel(b.status)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
