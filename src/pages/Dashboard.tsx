import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, PiggyBank,
  DollarSign, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { fetchDashboardSummary } from '@/lib/api';
import { getStatusColor, getStatusLabel } from '@/mocks/mockBudget';
import type { DashboardSummary } from '@/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardSummary().then((d) => { setData(d); setLoading(false); });
  }, []);

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
    { title: 'Total Income', value: data.totalIncome, icon: DollarSign, color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-500/10' },
    { title: 'Total Expenses', value: data.totalExpenses, icon: TrendingDown, color: 'from-rose-500 to-pink-600', bgColor: 'bg-rose-500/10' },
    { title: 'Surplus', value: data.surplus, icon: TrendingUp, color: 'from-violet-500 to-indigo-600', bgColor: 'bg-violet-500/10' },
    { title: 'Total Savings', value: data.totalSavings, icon: PiggyBank, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10' },
  ];

  const distributionData = [
    { name: 'Tithes', value: data.totalTithes, color: '#8b5cf6' },
    { name: 'Offering', value: data.totalOffering, color: '#6366f1' },
    { name: 'Savings', value: data.totalSavings, color: '#f59e0b' },
    { name: 'First Fruit', value: data.totalFirstFruit, color: '#10b981' },
  ];

  const chartData = data.monthlyData.map((m) => ({
    name: m.monthName.slice(0, 3),
    income: m.income,
    expenses: m.expenses,
    surplus: m.surplus,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Year 2026 — Ledger of Harvest overview</p>
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
                  <kpi.icon className={cn('h-5 w-5 bg-gradient-to-br bg-clip-text', kpi.color)} style={{ color: 'transparent', WebkitBackgroundClip: 'text', backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                <span>vs last year</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Income vs Expenses Bar Chart */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader>
            <CardTitle className="text-base">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'currentColor' }} />
                <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(val) => fmt(val as number)}
                />
                <Bar dataKey="income" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                  {distributionData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => fmt(val as number)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {distributionData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surplus Trend */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Monthly Surplus Trend</CardTitle>
        </CardHeader>
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

      {/* Monthly Status Table */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Monthly Status</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Surplus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyData.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{m.monthName}</TableCell>
                  <TableCell className="text-right">{fmt(m.income)}</TableCell>
                  <TableCell className="text-right">{fmt(m.expenses)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(m.surplus)}</TableCell>
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
