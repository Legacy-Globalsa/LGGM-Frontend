import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Wallet, Banknote, CreditCard, Smartphone, Building2,
  CheckCircle2, Circle, AlertTriangle, Edit2, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useYear } from '@/hooks/useYear';
import { useCurrency } from '@/hooks/useCurrency';
import {
  fetchObligations, updateObligationEntry, markSavingsTransferred,
  fetchMoneyAccounts, createMoneyAccount, deleteMoneyAccount,
  createObligation, deleteObligation,
} from '@/lib/api';
import { MONTH_SHORT, MONEY_ACCOUNT_TYPE_META } from '@/types';
import type { Obligation, MoneyAccount, MoneyAccountType } from '@/types';
import { cn } from '@/lib/utils';

const accountTypeIcons: Record<MoneyAccountType, typeof Wallet> = {
  bank_account: Building2,
  cash_on_hand: Wallet,
  stc_bank: Smartphone,
  gcash: Smartphone,
  e_wallet: CreditCard,
  other: Banknote,
};

export default function MoneyAccountsPage() {
  const { selectedYear, selectedYearId } = useYear();
  const { formatCurrency: fmt, currency } = useCurrency();

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Add account dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'bank_account' as MoneyAccountType,
    account_identifier: '',
    balance: '',
    notes: '',
  });
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [savingsForm, setSavingsForm] = useState({
    description: '',
    default_amount: '',
    frequency: 'Monthly' as Obligation['frequency'],
    remarks: '',
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchObligations(selectedYear, 'savings'),
      fetchMoneyAccounts(),
    ]).then(([obs, accs]) => {
      setObligations(obs);
      setAccounts(accs);
      setLoading(false);
    });
  }, [selectedYear]);

  const reload = async () => {
    const [obs, accs] = await Promise.all([
      fetchObligations(selectedYear, 'savings'),
      fetchMoneyAccounts(),
    ]);
    setObligations(obs);
    setAccounts(accs);
  };

  const totals = useMemo(() => {
    let planned = 0, recorded = 0, transferredActual = 0;
    obligations.forEach((o) => o.entries.forEach((e) => {
      planned += e.planned_amount;
      recorded += e.actual_amount;
      if (e.transferred_to_bank) transferredActual += e.actual_amount;
    }));
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    return { planned, recorded, transferredActual, totalBalance };
  }, [obligations, accounts]);

  const handleAddAccount = async () => {
    await createMoneyAccount({
      name: form.name,
      type: form.type,
      account_identifier: form.account_identifier,
      balance: parseFloat(form.balance) || 0,
      notes: form.notes,
    });
    await reload();
    toast.success('Account added');
    setAddOpen(false);
    setForm({ name: '', type: 'bank_account', account_identifier: '', balance: '', notes: '' });
  };

  const handleDeleteAccount = async (id: string) => {
    await deleteMoneyAccount(id);
    await reload();
    toast.success('Account removed');
  };

  const handleAddSavings = async () => {
    if (!selectedYearId) return;
    if (!savingsForm.description.trim()) {
      toast.error('Savings description is required.');
      return;
    }

    await createObligation({
      kind: 'savings',
      year_id: selectedYearId,
      description: savingsForm.description.trim(),
      frequency: savingsForm.frequency,
      default_amount: parseFloat(savingsForm.default_amount) || 0,
      remarks: savingsForm.remarks,
    });
    await reload();
    toast.success('Savings plan added');
    setSavingsOpen(false);
    setSavingsForm({ description: '', default_amount: '', frequency: 'Monthly', remarks: '' });
  };

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
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Money Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Manage your bank accounts, wallets, and e-wallets. Track where your savings go.
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Balance" value={fmt(totals.totalBalance)} accent="emerald" />
        <KpiCard label="Planned Savings (YTD)" value={fmt(totals.planned)} />
        <KpiCard label="Recorded Savings (YTD)" value={fmt(totals.recorded)} accent={totals.recorded < totals.planned ? 'amber' : 'emerald'} />
        <KpiCard label="Actual Savings (Transferred)" value={fmt(totals.transferredActual)} accent="emerald" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="savings">Savings Grid</TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-violet-600 to-indigo-600 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Money Account</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="e.g. Al Rajhi Bank, GCash"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as MoneyAccountType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(MONEY_ACCOUNT_TYPE_META) as [MoneyAccountType, { label: string }][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Account ID / Last 4 digits</Label>
                      <Input
                        placeholder="e.g. ••••4521"
                        value={form.account_identifier}
                        onChange={(e) => setForm({ ...form, account_identifier: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Balance</Label>
                    <Input
                      type="number" placeholder="0"
                      value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddAccount} className="bg-linear-to-r from-violet-600 to-indigo-600 text-white">Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {accounts.length === 0 ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No money accounts yet. Click <strong>Add Account</strong> to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => {
                const IconComp = accountTypeIcons[acc.type];
                const meta = MONEY_ACCOUNT_TYPE_META[acc.type];
                return (
                  <Card key={acc.id} className="group relative overflow-hidden border-border/40 transition-shadow hover:shadow-lg">
                    <div className="absolute inset-0 bg-linear-to-br from-violet-600/5 to-indigo-600/5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <IconComp className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <p className="font-semibold">{acc.name}</p>
                            <p className="text-[10px] font-normal text-muted-foreground">{meta.label}</p>
                          </div>
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              title="Remove account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove "{acc.name || acc.type}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will deactivate the account. Existing savings entries linked to it will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAccount(acc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
                        <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{fmt(acc.balance)}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{acc.account_identifier}</span>
                        <Badge variant="secondary" className={cn('text-[10px]', acc.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500')}>
                          {acc.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {acc.notes && <p className="text-[10px] italic text-muted-foreground">{acc.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Savings Grid Tab */}
        <TabsContent value="savings" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={savingsOpen} onOpenChange={setSavingsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-violet-600 to-indigo-600 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Savings Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Savings Plan</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g. Monthly Savings"
                      value={savingsForm.description}
                      onChange={(e) => setSavingsForm({ ...savingsForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={savingsForm.frequency} onValueChange={(v) => v && setSavingsForm({ ...savingsForm, frequency: v as Obligation['frequency'] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Annual">Annual</SelectItem>
                          <SelectItem value="One-off">One-off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Planned Amount ({currency})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={savingsForm.default_amount}
                        onChange={(e) => setSavingsForm({ ...savingsForm, default_amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input
                      placeholder="Optional"
                      value={savingsForm.remarks}
                      onChange={(e) => setSavingsForm({ ...savingsForm, remarks: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSavingsOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSavings} className="bg-linear-to-r from-violet-600 to-indigo-600 text-white">Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {obligations.length === 0 ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No savings plans for {selectedYear}. Click <strong>Add Savings Plan</strong> to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {obligations.map((o) => (
                <SavingsGrid
                  key={o.id}
                  obligation={o}
                  accounts={accounts}
                  onUpdated={reload}
                  onDeleted={reload}
                  fmt={fmt}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

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

function SavingsGrid({
  obligation, accounts, onUpdated, onDeleted, fmt,
}: {
  obligation: Obligation;
  accounts: MoneyAccount[];
  onUpdated: () => void;
  onDeleted: () => void;
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
    const existingEntry = obligation.entries.find((e) => e.month === editingMonth);
    const plannedFallback = existingEntry?.planned_amount ?? obligation.default_amount ?? 0;
    await updateObligationEntry(obligation.id, obligation.year_id, editingMonth, {
      actual_amount: value,
      paid: value > 0,
      planned_amount: plannedFallback,
    });
    setEditingMonth(null);
    onUpdated();
    toast.success('Saved');
  };

  const handleTransfer = async (month: number, accountId: string) => {
    await markSavingsTransferred(obligation.id, obligation.year_id, month, true, accountId);
    onUpdated();
    toast.success('Transferred to account');
  };

  const removeTransfer = async (month: number) => {
    await markSavingsTransferred(obligation.id, obligation.year_id, month, false);
    onUpdated();
    toast.success('Transfer removed');
  };

  const handleDelete = async () => {
    await deleteObligation(obligation.id);
    toast.success(`"${obligation.description}" deleted`);
    onDeleted();
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-semibold">{obligation.description}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">{obligation.frequency}</Badge>
              {obligation.remarks && <span className="truncate">· {obligation.remarks}</span>}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{obligation.description}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this savings plan and its monthly entries. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card min-w-20">Month</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center min-w-45">Transfer to Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const e = obligation.entries.find((x) => x.month === m);
              const planned = e?.planned_amount ?? obligation.default_amount ?? 0;
              const actual = e?.actual_amount ?? 0;
              const paid = e?.paid ?? false;
              const transferred = !!e?.transferred_to_bank;
              const transferredAccount = accounts.find((a) => a.id === e?.transferred_to_account);
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
                          className="h-8 w-27.5 text-right text-sm"
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
                  <TableCell className="text-center">
                    {transferred && transferredAccount ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] gap-1">
                          <Banknote className="h-3 w-3" />
                          {transferredAccount.name}
                        </Badge>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTransfer(m)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Select
                        disabled={!paid || accounts.length === 0}
                        onValueChange={(accountId: string | null) => {
                          if (accountId) handleTransfer(m, accountId);
                        }}
                      >
                        <SelectTrigger className={cn('h-7 text-[11px] w-40 mx-auto', (!paid || accounts.length === 0) && 'opacity-50')}>
                          <SelectValue placeholder={accounts.length === 0 ? 'Add account first' : 'Select account'} />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs">
                              {acc.name} ({MONEY_ACCOUNT_TYPE_META[acc.type as MoneyAccountType].label})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
