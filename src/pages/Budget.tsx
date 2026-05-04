import { useEffect, useState } from 'react';
import { Scale, TrendingUp, TrendingDown, Percent, Filter, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchBudgets, fetchYear } from '@/lib/api';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { getMonthName } from '@/types';
import type { MonthlyBudget, Year } from '@/types';
import { useYear } from '@/hooks/useYear';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

export default function Budget() {
  const { selectedYear, selectedYearId } = useYear();
  const { formatCurrency: fmt } = useCurrency();
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [year, setYear] = useState<Year | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState('summary');

  useEffect(() => {
    if (!selectedYearId) return;
    setLoading(true);
    Promise.all([fetchBudgets(selectedYearId), fetchYear(selectedYear)]).then(([b, y]) => {
      setBudgets(b); setYear(y); setLoading(false);
    });
  }, [selectedYearId, selectedYear]);

  if (loading || !year) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  const totalIncome = budgets.reduce((s, b) => s + b.income_amount, 0);
  const totalActual = budgets.reduce(
    (s, b) => s + b.fixed_bills_actual + b.loans_actual + b.other_actual,
    0,
  );
  const underCount = budgets.filter((b) => b.status === 'under_budget').length;
  const overCount = budgets.filter((b) => b.status === 'over_budget').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Budget vs Actual</h1>
          <p className="text-sm text-muted-foreground">Compare planned vs actual for {year.year}</p>
        </div>
      </div>

      {/* Year defaults */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-violet-500" /> Year Defaults
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-5">
            {[
              { label: 'Tithes', value: year.tithes_pct },
              { label: 'Offering', value: year.offering_pct },
              { label: 'Savings', value: year.savings_pct },
              { label: 'First Fruit', value: year.first_fruit_pct },
              { label: 'Other', value: year.other_expenses_pct },
            ].map((d) => (
              <div key={d.label} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{d.label}</Label>
                <Input value={`${d.value}%`} readOnly className="bg-muted/30 text-center font-semibold" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Per-month overrides are configured in <strong>Settings → Monthly Percentage Overrides</strong>.
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><Scale className="h-8 w-8 text-violet-500" /><div><p className="text-xs text-muted-foreground">Total Income</p><p className="text-lg font-bold">{fmt(totalIncome)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingDown className="h-8 w-8 text-rose-500" /><div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-lg font-bold">{fmt(totalActual)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingUp className="h-8 w-8 text-emerald-500" /><div><p className="text-xs text-muted-foreground">Under Budget</p><p className="text-lg font-bold text-emerald-600">{underCount} months</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingDown className="h-8 w-8 text-rose-500" /><div><p className="text-xs text-muted-foreground">Over Budget</p><p className="text-lg font-bold text-rose-600">{overCount} months</p></div></CardContent></Card>
      </div>

      {/* Tabs for Table View */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-500" />
              Monthly Breakdown — Planned vs Actual
            </CardTitle>
            <Tabs value={viewTab} onValueChange={setViewTab} className="w-[340px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="giving">Giving</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 w-[120px]">Month</TableHead>
                {viewTab === 'summary' && (
                  <>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        Income
                        <ArrowRightLeft className="h-3 w-3 text-violet-400" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Total Giving (A)</TableHead>
                    <TableHead className="text-right">Total Exp (A)</TableHead>
                    <TableHead>Status</TableHead>
                  </>
                )}
                {viewTab === 'giving' && (
                  <>
                    <TableHead className="text-right">Tithes P</TableHead>
                    <TableHead className="text-right">Tithes A</TableHead>
                    <TableHead className="text-right border-l">Offer P</TableHead>
                    <TableHead className="text-right">Offer A</TableHead>
                    <TableHead className="text-right border-l">FF P</TableHead>
                    <TableHead className="text-right">FF A</TableHead>
                  </>
                )}
                {viewTab === 'expenses' && (
                  <>
                    <TableHead className="text-right">Save P</TableHead>
                    <TableHead className="text-right">Save A</TableHead>
                    <TableHead className="text-right border-l">Bills</TableHead>
                    <TableHead className="text-right border-l">Loans</TableHead>
                    <TableHead className="text-right border-l">
                      <span className="flex items-center justify-end gap-1">
                        Other
                        <ArrowRightLeft className="h-3 w-3 text-violet-400" />
                      </span>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((b) => {
                const totalGivingA = b.tithes_actual + b.offering_actual + b.first_fruit_actual;
                const totalExpA = b.fixed_bills_actual + b.loans_actual + b.other_actual;

                return (
                  <TableRow key={b.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">{getMonthName(b.month)}</TableCell>

                    {viewTab === 'summary' && (
                      <>
                        <TableCell className="text-right font-semibold">{fmt(b.income_amount)}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-semibold">{fmt(totalGivingA)}</TableCell>
                        <TableCell className="text-right text-rose-600 font-semibold">{fmt(totalExpA)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('text-[10px]', getStatusColor(b.status))}>
                            {getStatusLabel(b.status)}
                          </Badge>
                        </TableCell>
                      </>
                    )}

                    {viewTab === 'giving' && (
                      <>
                        <Cell planned={b.tithes_planned} actual={b.tithes_actual} which="planned" fmt={fmt} />
                        <Cell planned={b.tithes_planned} actual={b.tithes_actual} which="actual" fmt={fmt} />
                        <Cell planned={b.offering_planned} actual={b.offering_actual} which="planned" fmt={fmt} className="border-l" />
                        <Cell planned={b.offering_planned} actual={b.offering_actual} which="actual" fmt={fmt} />
                        <Cell planned={b.first_fruit_planned} actual={b.first_fruit_actual} which="planned" fmt={fmt} className="border-l" />
                        <Cell planned={b.first_fruit_planned} actual={b.first_fruit_actual} which="actual" fmt={fmt} />
                      </>
                    )}

                    {viewTab === 'expenses' && (
                      <>
                        <Cell planned={b.savings_planned} actual={b.savings_actual} which="planned" fmt={fmt} />
                        <Cell planned={b.savings_planned} actual={b.savings_actual} which="actual" fmt={fmt} />
                        <TableCell className="text-right font-semibold border-l">{fmt(b.fixed_bills_actual)}</TableCell>
                        <TableCell className="text-right font-semibold border-l">{fmt(b.loans_actual)}</TableCell>
                        <TableCell className="text-right font-semibold border-l">{fmt(b.other_actual)}</TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Source legend */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ArrowRightLeft className="h-3 w-3 text-violet-400 shrink-0" />
        Columns marked with this icon are sourced directly from your <strong>Transactions</strong> — adding or removing transactions automatically updates those values here.
      </p>
    </div>
  );
}

function Cell({ planned, actual, which, fmt, className }: { planned: number; actual: number; which: 'planned' | 'actual', fmt: (n: number) => string, className?: string }) {
  const value = which === 'planned' ? planned : actual;
  const off = which === 'actual' && actual < planned && actual > 0;
  return (
    <TableCell className={cn(
      'text-right',
      which === 'planned' ? 'text-muted-foreground' : off ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'font-semibold',
      className
    )}>
      {fmt(value)}
    </TableCell>
  );
}
