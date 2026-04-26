import { useEffect, useMemo, useState } from 'react';
import { Plus, CheckCircle2, Circle, Banknote, AlertTriangle, Edit2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useYear } from '@/hooks/useYear';
import { useCurrency } from '@/hooks/useCurrency';
import {
  fetchObligations, createObligation, updateObligationEntry, markSavingsTransferred,
} from '@/lib/api';
import { MONTH_SHORT, OBLIGATION_KIND_META } from '@/types';
import type { Obligation, ObligationKind } from '@/types';
import { cn } from '@/lib/utils';

interface ObligationPageProps {
  kind: ObligationKind;
  icon: LucideIcon;
  description: string;
}

/**
 * Generic page for any obligation kind: tithes, offering, first_fruit, savings, fixed_bill, loan, other.
 * Renders KPI cards, an add dialog, and a per-month Planned vs Actual grid.
 * For `savings`, includes per-month "Transfer to Bank" toggle.
 * For `loan`, includes the loan-specific fields in the add dialog.
 */
export function ObligationPage({ kind, icon: Icon, description }: ObligationPageProps) {
  const meta = OBLIGATION_KIND_META[kind];
  const isSavings = kind === 'savings';
  const isLoan = kind === 'loan';
  const isDistribution = !!meta.pctField;

  const { selectedYear } = useYear();
  const { formatCurrency: fmt, currency } = useCurrency();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    description: '', frequency: 'Monthly' as Obligation['frequency'],
    default_amount: '', remarks: '',
    interest_bearing: false, interest_pct: '0',
    duration: '', loan_amount: '',
  });

  useEffect(() => {
    setLoading(true);
    fetchObligations(selectedYear, kind).then((o) => { setObligations(o); setLoading(false); });
  }, [selectedYear, kind]);

  const reload = () => fetchObligations(selectedYear, kind).then(setObligations);

  const handleAdd = async () => {
    const amt = parseFloat(form.default_amount) || null;
    const loanAmt = parseFloat(form.loan_amount) || 0;
    const intPct = parseFloat(form.interest_pct) || 0;
    await createObligation({
      kind,
      description: form.description,
      frequency: form.frequency,
      default_amount: amt,
      remarks: form.remarks,
      ...(isLoan ? {
        interest_bearing: form.interest_bearing,
        interest_pct: intPct,
        duration: form.duration,
        loan_amount: loanAmt,
        interest_amount: form.interest_bearing ? (loanAmt * intPct) / 100 : 0,
      } : {}),
    });
    await reload();
    toast.success(`${meta.label} added`);
    setDialogOpen(false);
    setForm({
      description: '', frequency: 'Monthly', default_amount: '', remarks: '',
      interest_bearing: false, interest_pct: '0', duration: '', loan_amount: '',
    });
  };

  const totals = useMemo(() => {
    let planned = 0, actual = 0, transferredActual = 0, paidCount = 0, totalEntries = 0;
    obligations.forEach((o) => o.entries.forEach((e) => {
      planned += e.planned_amount;
      actual += e.actual_amount;
      if (isSavings && e.transferred_to_bank) transferredActual += e.actual_amount;
      if (e.paid) paidCount++;
      totalEntries++;
    }));
    return { planned, actual, transferredActual, paidCount, totalEntries };
  }, [obligations, isSavings]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{meta.pluralLabel}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add {meta.label}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New {meta.label}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder={`e.g. ${exampleDescription(kind)}`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => v && setForm({ ...form, frequency: v as Obligation['frequency'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                      <SelectItem value="One-off">One-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isLoan && (
                  <div className="space-y-2">
                    <Label>{isDistribution ? `Suggested Amount (${currency})` : `Amount (${currency})`}</Label>
                    <Input
                      type="number" placeholder={isDistribution ? 'auto from %' : '0'}
                      value={form.default_amount}
                      onChange={(e) => setForm({ ...form, default_amount: e.target.value })}
                    />
                  </div>
                )}
              </div>
              {isLoan && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loan Amount ({currency})</Label>
                      <Input type="number" value={form.loan_amount} onChange={(e) => setForm({ ...form, loan_amount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input placeholder="e.g. 24 months" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.interest_bearing} onCheckedChange={(c) => setForm({ ...form, interest_bearing: c })} />
                    <Label>Interest Bearing</Label>
                  </div>
                  {form.interest_bearing && (
                    <div className="space-y-2">
                      <Label>Interest Rate (%)</Label>
                      <Input type="number" value={form.interest_pct} onChange={(e) => setForm({ ...form, interest_pct: e.target.value })} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Monthly Payment ({currency})</Label>
                    <Input type="number" value={form.default_amount} onChange={(e) => setForm({ ...form, default_amount: e.target.value })} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input placeholder="Optional" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI strip */}
      <div className={cn('grid gap-4', isSavings ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        <KpiCard label="Planned (YTD)"  value={fmt(totals.planned)} />
        <KpiCard label="Actual (YTD)"   value={fmt(totals.actual)} accent={totals.actual < totals.planned ? 'amber' : 'emerald'} />
        {isSavings && (
          <KpiCard label="In bank (YTD)" value={fmt(totals.transferredActual)} accent="emerald" />
        )}
        <KpiCard
          label={isSavings ? 'Transferred entries' : 'Paid entries'}
          value={`${isSavings
            ? obligations.flatMap((o) => o.entries).filter((e) => e.transferred_to_bank).length
            : totals.paidCount}/${totals.totalEntries}`}
        />
      </div>

      {/* Per-obligation grids */}
      {obligations.length === 0 ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No {meta.pluralLabel.toLowerCase()} for {selectedYear}. Click <strong>Add {meta.label}</strong> to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {obligations.map((o) => (
            <ObligationGrid
              key={o.id}
              obligation={o}
              isSavings={isSavings}
              onUpdated={reload}              fmt={fmt}            />
          ))}
        </div>
      )}
    </div>
  );
}

function exampleDescription(kind: ObligationKind): string {
  return {
    tithes: 'Monthly Tithe',
    offering: 'Sunday Offering',
    first_fruit: 'First Fruit Offering',
    savings: 'Monthly Savings',
    fixed_bill: 'House Rent',
    loan: 'Personal Loan',
    other: 'Family Support',
  }[kind];
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'amber' }) {
  const text = accent === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : accent === 'amber'
    ? 'text-amber-600 dark:text-amber-400'
    : '';
  return (
    <Card className="border-border/40">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-lg font-bold', text)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ObligationGrid({
  obligation, isSavings, onUpdated, fmt,
}: {
  obligation: Obligation;
  isSavings: boolean;
  onUpdated: () => void;
  fmt: (n: number) => string;
}) {
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [actualDraft, setActualDraft] = useState('');

  const startEdit = (month: number) => {
    const e = obligation.entries.find((e) => e.month === month);
    setActualDraft(String(e?.actual_amount ?? ''));
    setEditingMonth(month);
  };

  const saveActual = async () => {
    if (editingMonth == null) return;
    const value = parseFloat(actualDraft) || 0;
    await updateObligationEntry(obligation.id, editingMonth, {
      actual_amount: value,
      paid: value > 0,
    });
    setEditingMonth(null);
    onUpdated();
    toast.success('Saved');
  };

  const toggleTransferred = async (month: number, currently: boolean) => {
    await markSavingsTransferred(obligation.id, month, !currently);
    onUpdated();
    toast.success(!currently ? 'Marked transferred to bank' : 'Removed transfer flag');
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-semibold">{obligation.description}</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">{obligation.frequency}</Badge>
            {obligation.remarks && <span className="truncate">· {obligation.remarks}</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card min-w-[80px]">Month</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {isSavings && <TableHead className="text-center min-w-[140px]">Transferred to bank</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const e = obligation.entries.find((x) => x.month === m);
              const planned = e?.planned_amount ?? 0;
              const actual = e?.actual_amount ?? 0;
              const paid = e?.paid ?? false;
              const transferred = !!e?.transferred_to_bank;
              const off = actual < planned;
              return (
                <TableRow key={m}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">{MONTH_SHORT[m - 1]}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(planned)}</TableCell>
                  <TableCell className="text-right">
                    {editingMonth === m ? (
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number" autoFocus
                          value={actualDraft}
                          onChange={(ev) => setActualDraft(ev.target.value)}
                          onKeyDown={(ev) => { if (ev.key === 'Enter') saveActual(); if (ev.key === 'Escape') setEditingMonth(null); }}
                          className="h-8 w-[110px] text-right text-sm"
                        />
                        <Button size="sm" className="h-8" onClick={saveActual}>Save</Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className={cn('group flex items-center justify-end w-full rounded px-2 py-1 font-semibold transition-colors hover:bg-accent',
                          off && actual > 0 ? 'text-amber-600 dark:text-amber-400'
                            : actual > 0 ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground')}
                      >
                        <span className="flex items-center gap-1.5">
                          {fmt(actual)}
                          {off && actual > 0 && <AlertTriangle className="h-3 w-3" />}
                          <Edit2 className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
                        </span>
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {paid
                      ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                      : <Circle className="mx-auto h-4 w-4 text-muted-foreground/30" />}
                  </TableCell>
                  {isSavings && (
                    <TableCell className="text-center">
                      <Button
                        size="sm" variant={transferred ? 'default' : 'outline'}
                        className={cn('h-7 gap-1.5 text-[11px]',
                          transferred && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                        onClick={() => toggleTransferred(m, transferred)}
                        disabled={!paid}
                        title={!paid ? 'Mark as given first' : ''}
                      >
                        <Banknote className="h-3 w-3" />
                        {transferred ? 'In bank' : 'Mark transferred'}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
