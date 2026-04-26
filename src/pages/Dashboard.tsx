import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, PiggyBank, DollarSign,
  HandCoins, Sparkles, Heart, AlertTriangle, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts';
import { fetchDashboardSummary } from '@/lib/api';
import { getStatusColor, getStatusLabel } from '@/mocks/mockObligations';
import { useYear } from '@/hooks/useYear';
import { useCurrency } from '@/hooks/useCurrency';
import type { DashboardSummary, PlannedActualPair } from '@/types';
import { cn } from '@/lib/utils';

const pct = (pair: PlannedActualPair) =>
  pair.planned > 0 ? Math.round((pair.actual / pair.planned) * 100) : 0;

export default function Dashboard() {
  const { selectedYear } = useYear();
  const { formatCurrency: fmt } = useCurrency();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboardSummary(selectedYear).then((d) => { setData(d); setLoading(false); });
  }, [selectedYear]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const kpiCards = [
    { title: 'Total Income',   value: data.totalIncome,   icon: DollarSign,    color: 'from-emerald-500 to-teal-600',    bgColor: 'bg-emerald-500/10' },
    { title: 'Total Expenses', value: data.totalExpenses, icon: TrendingDown,  color: 'from-rose-500 to-pink-600',       bgColor: 'bg-rose-500/10' },
    { title: 'Surplus',        value: data.surplus,       icon: TrendingUp,    color: 'from-violet-500 to-indigo-600',   bgColor: 'bg-violet-500/10' },
    { title: 'Savings (in bank)', value: data.savings.actual, icon: PiggyBank, color: 'from-amber-500 to-orange-600',    bgColor: 'bg-amber-500/10' },
  ];

  const chartData = data.monthlyData.map((m) => ({
    name: m.monthName.slice(0, 3),
    income: m.income,
    expenses: m.expenses,
    surplus: m.surplus,
    savingsPlanned: m.savings.planned,
    savingsActual: m.savings.actual,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Year {data.year} — Planned vs Actual overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="group relative overflow-hidden border-border/40 transition-shadow hover:shadow-lg">
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-[0.03]', kpi.color)} />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold tracking-tight">{fmt(kpi.value)}</p>
                </div>
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', kpi.bgColor)}>
                  <kpi.icon className="h-5 w-5 text-foreground/80" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Planned vs Actual — distribution side-by-side */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlannedActualCard title="Tithes"      icon={HandCoins} pair={data.tithes}     accent="violet" />
        <PlannedActualCard title="Offering"    icon={Sparkles}  pair={data.offering}   accent="indigo" />
        <PlannedActualCard title="First Fruit" icon={Heart}     pair={data.firstFruit} accent="emerald" />
        <PlannedActualCard
          title="Savings"
          icon={PiggyBank}
          pair={data.savings}
          accent="amber"
          footnote="Actual counts only after transfer to bank"
        />
      </div>

      {/* Income vs Expenses + Savings Planned vs Actual */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor' }} />
                <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                <Tooltip formatter={(val) => fmt(val as number)} />
                <Bar dataKey="income" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">Savings — Planned vs Actual (transferred)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor' }} />
                <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                <Tooltip formatter={(val) => fmt(val as number)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="savingsPlanned" name="Planned" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savingsActual"  name="In bank" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Surplus Trend */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Monthly Surplus Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor' }} />
              <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
              <Tooltip formatter={(val) => fmt(val as number)} />
              <Area type="monotone" dataKey="surplus" stroke="#8b5cf6" fill="url(#surplusGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Status Table — now shows Planned vs Actual per distribution */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Monthly Distribution — Planned vs Actual</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Tithes (P / A)</TableHead>
                <TableHead className="text-right">Offering (P / A)</TableHead>
                <TableHead className="text-right">First Fruit (P / A)</TableHead>
                <TableHead className="text-right">Savings (P / In bank)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyData.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{m.monthName}</TableCell>
                  <TableCell className="text-right">{fmt(m.income)}</TableCell>
                  <TableCell className="text-right text-xs"><PvA pair={m.tithes} fmt={fmt} /></TableCell>
                  <TableCell className="text-right text-xs"><PvA pair={m.offering} fmt={fmt} /></TableCell>
                  <TableCell className="text-right text-xs"><PvA pair={m.firstFruit} fmt={fmt} /></TableCell>
                  <TableCell className="text-right text-xs"><PvA pair={m.savings} fmt={fmt} /></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-[10px]', getStatusColor(m.status))}>
                      {getStatusLabel(m.status)}
                    </Badge>
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

// ─── Building blocks ──────────────────────────────────────────────────

function PvA({ pair, fmt }: { pair: PlannedActualPair, fmt: (n: number) => string }) {
  const ratio = pct(pair);
  const off = pair.actual < pair.planned;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">{fmt(pair.planned)}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
      <span className={cn('font-semibold', off ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
        {fmt(pair.actual)}
      </span>
      <span className="text-muted-foreground/70">({ratio}%)</span>
    </span>
  );
}

function PlannedActualCard({
  title, icon: Icon, pair, accent, footnote,
}: {
  title: string;
  icon: LucideIcon;
  pair: PlannedActualPair;
  accent: 'violet' | 'indigo' | 'emerald' | 'amber';
  footnote?: string;
}) {
  const { formatCurrency: fmt } = useCurrency();
  const ratio = pct(pair);
  const diff = pair.actual - pair.planned;
  const accentClass = {
    violet:  'bg-violet-500/10  text-violet-600  dark:text-violet-400',
    indigo:  'bg-indigo-500/10  text-indigo-600  dark:text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-500/10   text-amber-600   dark:text-amber-400',
  }[accent];

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentClass)}>
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </span>
          {diff < 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 divide-x divide-border/40">
          <div className="pr-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Planned</p>
            <p className="text-lg font-bold tracking-tight">{fmt(pair.planned)}</p>
          </div>
          <div className="pl-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Actual</p>
            <p className={cn('text-lg font-bold tracking-tight', diff < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
              {fmt(pair.actual)}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{ratio}% of planned</span>
            <span className={cn(diff < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
              {diff >= 0 ? '+' : ''}{fmt(diff)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', diff < 0 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${Math.min(ratio, 100)}%` }}
            />
          </div>
        </div>
        {footnote && <p className="text-[10px] italic text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}
