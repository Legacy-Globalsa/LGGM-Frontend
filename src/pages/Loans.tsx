import { useEffect, useState } from 'react';
import { Plus, Landmark, TrendingDown, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { fetchLoans, createLoan } from '@/lib/api';
import { MONTH_SHORT } from '@/types';
import type { Loan } from '@/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ description: '', interest_bearing: false, interest_pct: '0', duration: '', loan_amount: '' });

  useEffect(() => { fetchLoans().then((l) => { setLoans(l); setLoading(false); }); }, []);

  const handleAdd = async () => {
    const amt = parseFloat(form.loan_amount) || 0;
    const intPct = parseFloat(form.interest_pct) || 0;
    await createLoan({ ...form, loan_amount: amt, interest_pct: intPct, interest_amount: form.interest_bearing ? amt * intPct / 100 : 0 });
    const updated = await fetchLoans();
    setLoans(updated);
    setDialogOpen(false);
    setForm({ description: '', interest_bearing: false, interest_pct: '0', duration: '', loan_amount: '' });
  };

  const totalLoans = loans.reduce((s, l) => s + l.loan_amount + l.interest_amount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.payments.reduce((a, p) => a + p.amount, 0), 0);
  const outstanding = totalLoans - totalPaid;

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Loans & Payables</h1>
          <p className="text-sm text-muted-foreground">Track loan repayments and outstanding balances</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Plus className="mr-2 h-4 w-4" /> Add Loan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Description</Label><Input placeholder="e.g. Personal Loan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Loan Amount (SAR)</Label><Input type="number" placeholder="0" value={form.loan_amount} onChange={(e) => setForm({ ...form, loan_amount: e.target.value })} /></div>
                <div className="space-y-2"><Label>Duration</Label><Input placeholder="e.g. 24 months" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.interest_bearing} onCheckedChange={(c) => setForm({ ...form, interest_bearing: c })} />
                <Label>Interest Bearing</Label>
              </div>
              {form.interest_bearing && (
                <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" value={form.interest_pct} onChange={(e) => setForm({ ...form, interest_pct: e.target.value })} /></div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><Landmark className="h-8 w-8 text-violet-500" /><div><p className="text-xs text-muted-foreground">Total Loans</p><p className="text-lg font-bold">{fmt(totalLoans)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><TrendingDown className="h-8 w-8 text-emerald-500" /><div><p className="text-xs text-muted-foreground">YTD Paid</p><p className="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><Calculator className="h-8 w-8 text-rose-500" /><div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-rose-600">{fmt(outstanding)}</p></div></CardContent></Card>
      </div>

      {/* Loan Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loans.map((loan) => {
          const total = loan.loan_amount + loan.interest_amount;
          const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
          const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
          return (
            <Card key={loan.id} className="border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{loan.description}</CardTitle>
                  {loan.interest_bearing && <Badge variant="secondary" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10">{loan.interest_pct}% interest</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Principal</p><p className="font-semibold">{fmt(loan.loan_amount)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Interest</p><p className="font-semibold">{fmt(loan.interest_amount)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-emerald-600">{fmt(paid)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-semibold text-rose-600">{fmt(total - paid)}</p></div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{pct}%</span></div>
                  <Progress value={pct} className="h-2" />
                </div>
                <div className="flex gap-1 pt-1">
                  {MONTH_SHORT.map((m, i) => {
                    const hasPmt = loan.payments.some((p) => p.month === i + 1);
                    return (
                      <div key={m} className={cn('flex-1 rounded-sm py-1 text-center text-[9px] font-medium', hasPmt ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground/40')}>{m}</div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
