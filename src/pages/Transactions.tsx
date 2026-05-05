import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, Link2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  fetchTransactions, fetchCategories, seedDefaultCategories, createTransaction, updateTransaction,
  deleteTransaction, fetchTransactionAggregates, fetchMoneyAccounts,
} from '@/lib/api';
import type {
  Transaction, Category, TransactionType, TransactionMonthAggregate, MoneyAccount,
} from '@/types';
import { MONTHS } from '@/types';
import { useYear } from '@/hooks/useYear';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Transactions() {
  const { selectedYear, selectedYearId } = useYear();
  const { formatCurrency: fmt, currency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [aggregates, setAggregates] = useState<TransactionMonthAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterMonth, setFilterMonth] = useState<'all' | string>('all');

  const [moneyAccounts, setMoneyAccounts] = useState<MoneyAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    description: string; type: TransactionType; category_id: string;
    amount: string; notes: string; transaction_date: string; money_account_id: string;
  }>({
    description: '', type: 'expense',
    category_id: '', amount: '', notes: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    money_account_id: '',
  });

  useEffect(() => {
    if (!selectedYearId) return;
    setLoading(true);
    Promise.all([
      fetchTransactions(selectedYearId, filterMonth === 'all' ? undefined : Number(filterMonth)),
      fetchCategories(),
      fetchTransactionAggregates(selectedYearId),
      fetchMoneyAccounts(),
    ]).then(async ([t, c, agg, accts]) => {
      // Auto-seed default categories for new users
      const cats = c.length === 0 ? await seedDefaultCategories() : c;
      setTransactions(t); setCategories(cats); setAggregates(agg); setMoneyAccounts(accts);
      setLoading(false);
    });
  }, [selectedYearId, filterMonth]);

  const reload = () => {
    if (!selectedYearId) return Promise.resolve();
    return Promise.all([
      fetchTransactions(selectedYearId, filterMonth === 'all' ? undefined : Number(filterMonth)),
      fetchTransactionAggregates(selectedYearId),
    ]).then(([t, agg]) => { setTransactions(t); setAggregates(agg); });
  };

  const resetForm = () => {
    setForm({
      description: '', type: 'expense', category_id: '',
      amount: '', notes: '', transaction_date: format(new Date(), 'yyyy-MM-dd'),
      money_account_id: '',
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.description || !form.category_id || !amount) {
      toast.error('Description, category and amount are required.');
      return;
    }
    if (!form.money_account_id) {
      toast.error('Please select an account.');
      return;
    }
    const month = new Date(form.transaction_date).getMonth() + 1;
    const category = categories.find((c) => c.id === form.category_id);
    const payload = {
      ...form,
      amount,
      month,
      year_id: selectedYearId ?? '',
      category_name: category?.name,
      money_account_id: form.money_account_id || null,
    };
    if (editingId) {
      await updateTransaction(editingId, payload);
      toast.success('Transaction updated');
    } else {
      await createTransaction(payload);
      toast.success('Transaction added');
    }
    await reload();
    setDialogOpen(false);
    resetForm();
  };

  const handleStartEdit = (t: Transaction) => {
    setEditingId(t.id);
    setForm({
      description: t.description,
      type: t.type,
      category_id: t.category_id,
      amount: String(t.amount),
      notes: t.notes ?? '',
      transaction_date: t.transaction_date,
      money_account_id: t.money_account_id ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    await reload();
    toast.success('Transaction deleted');
  };

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const filteredCategories = categories.filter((c) => c.type === form.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transactions</h1>
          <p className="text-sm text-muted-foreground">All income and expenses for {selectedYear}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-linear-to-r from-violet-600 to-indigo-600 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Edit Transaction' : 'New Transaction'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TransactionType, category_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => v && setForm({ ...form, category_id: v })}>
                    <SelectTrigger>
                      <span className={cn('truncate text-sm', !form.category_id && 'text-muted-foreground')}>
                        {filteredCategories.find((c) => c.id === form.category_id)?.name ?? 'Select category'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount ({currency})</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Account</Label>
                  <TooltipProvider delay={100}>
                    <Tooltip>
                      <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-56 text-xs">
                        You must first create a money account on the{' '}
                        <strong>Money Accounts</strong> page before you can select one here.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={form.money_account_id as string} onValueChange={(v) => setForm({ ...form, money_account_id: v })}>
                  <SelectTrigger>
                    <span className={cn('truncate text-sm', !form.money_account_id && 'text-muted-foreground')}>
                      {moneyAccounts.find((a) => a.id === form.money_account_id)?.name ?? 'Select account'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {moneyAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} className="bg-linear-to-r from-violet-600 to-indigo-600 text-white">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold text-emerald-600">{fmt(totalIncome)}</p></CardContent></Card>
        <Card className="border-border/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold text-rose-600">{fmt(totalExpense)}</p></CardContent></Card>
        <Card className="border-border/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net</p><p className={cn('text-lg font-bold', totalIncome - totalExpense >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmt(totalIncome - totalExpense)}</p></CardContent></Card>
      </div>

      {/* Budget Impact — per-month aggregates fed into Budget page */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-violet-500" />
            Budget Impact — Monthly Totals
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              These totals feed into Budget → Income Amount &amp; Other (Expenses)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Month</th>
                <th className="px-4 py-2 text-right font-medium">
                  <span className="flex items-center justify-end gap-1"><ArrowUpCircle className="h-3 w-3 text-emerald-500" /> Income</span>
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  <span className="flex items-center justify-end gap-1"><ArrowDownCircle className="h-3 w-3 text-rose-500" /> Expenses</span>
                </th>
                <th className="px-4 py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {aggregates.map((a) => {
                const net = a.income - a.expenses;
                return (
                  <tr key={a.month} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-medium">{MONTHS[a.month - 1]}</td>
                    <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{fmt(a.income)}</td>
                    <td className="px-4 py-2 text-right text-rose-600 font-semibold">{fmt(a.expenses)}</td>
                    <td className={cn('px-4 py-2 text-right font-semibold', net >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {net >= 0 ? '+' : ''}{fmt(net)}
                    </td>
                  </tr>
                );
              })}
              {aggregates.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No transactions yet for {selectedYear}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | TransactionType)}>
              <SelectTrigger className="sm:w-35"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={(v) => v && setFilterMonth(v)}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">{filtered.length} entries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.transaction_date), 'MMM d')}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{t.money_account_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]',
                        t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600')}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('text-right font-semibold',
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                      {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleStartEdit(t)} className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)} className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
