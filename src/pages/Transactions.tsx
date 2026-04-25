import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Search, Trash2, Pencil, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTransactions, createTransaction, deleteTransaction, fetchCategories } from '@/lib/api';
import { MONTH_SHORT } from '@/types';
import type { Transaction, Category } from '@/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState('1');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New transaction form state
  const [formData, setFormData] = useState({ description: '', type: 'expense' as 'income' | 'expense', category_id: '', amount: '', notes: '', transaction_date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchCategories()]).then(([t, c]) => {
      setTransactions(t);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  const month = parseInt(activeMonth);
  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.month === month)
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()));
  }, [transactions, month, typeFilter, search]);

  const totals = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const handleAdd = async () => {
    const cat = categories.find((c) => c.id === formData.category_id);
    await createTransaction({ ...formData, month, amount: parseFloat(formData.amount) || 0, category_name: cat?.name });
    const updated = await fetchTransactions();
    setTransactions(updated);
    setDialogOpen(false);
    setFormData({ description: '', type: 'expense', category_id: '', amount: '', notes: '', transaction_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTransaction(deleteId);
    setTransactions((prev) => prev.filter((t) => t.id !== deleteId));
    setDeleteId(null);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transactions</h1>
          <p className="text-sm text-muted-foreground">Daily income and expense entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'income' | 'expense', category_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="e.g. Monthly Salary" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => v !== null && setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c.type === formData.type).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (SAR)</Label>
                  <Input type="number" placeholder="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Tabs */}
      <Tabs value={activeMonth} onValueChange={setActiveMonth}>
        <TabsList className="flex-wrap h-auto gap-1">
          {MONTH_SHORT.map((m, i) => (
            <TabsTrigger key={i} value={String(i + 1)} className="text-xs">{m}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeMonth} className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Income</p><p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.income)}</p></CardContent></Card>
            <Card className="border-rose-500/20 bg-rose-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-xl font-bold text-rose-600 dark:text-rose-400">{fmt(totals.expense)}</p></CardContent></Card>
            <Card className="border-violet-500/20 bg-violet-500/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net</p><p className="text-xl font-bold text-violet-600 dark:text-violet-400">{fmt(totals.net)}</p></CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[140px]"><Filter className="mr-2 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="border-border/40">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No transactions found</TableCell></TableRow>
                  ) : (
                    filtered.map((t) => (
                      <TableRow key={t.id} className="group">
                        <TableCell className="whitespace-nowrap text-sm">{format(new Date(t.transaction_date), 'MMM dd')}</TableCell>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{t.category_name}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', t.type === 'income' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-rose-500/30 text-rose-600 dark:text-rose-400')}>
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn('text-right font-semibold', t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Transaction</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
