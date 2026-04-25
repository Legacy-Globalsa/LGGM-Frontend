import { useEffect, useState } from 'react';
import { Plus, Pencil, Receipt, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchBills, createBill } from '@/lib/api';
import { MONTH_SHORT } from '@/types';
import type { FixedMonthlyBill } from '@/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default function Bills() {
  const [bills, setBills] = useState<FixedMonthlyBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ description: '', frequency: 'Monthly', amount: '', remarks: '' });

  useEffect(() => { fetchBills().then((b) => { setBills(b); setLoading(false); }); }, []);

  const handleAdd = async () => {
    await createBill({ ...form, amount: parseFloat(form.amount) || 0 });
    const updated = await fetchBills();
    setBills(updated);
    setDialogOpen(false);
    setForm({ description: '', frequency: 'Monthly', amount: '', remarks: '' });
  };

  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills.reduce((s, b) => s + b.payments.filter((p) => p.paid).reduce((a, p) => a + p.amount, 0), 0);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Fixed Monthly Bills</h1>
          <p className="text-sm text-muted-foreground">Recurring bills and payment tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Plus className="mr-2 h-4 w-4" /> Add Bill</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Bill</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Description</Label><Input placeholder="e.g. House Rent" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Amount (SAR)</Label><Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Remarks</Label><Input placeholder="Optional" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
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
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><Receipt className="h-8 w-8 text-violet-500" /><div><p className="text-xs text-muted-foreground">Monthly Total</p><p className="text-lg font-bold">{fmt(totalMonthly)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><div><p className="text-xs text-muted-foreground">YTD Paid</p><p className="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</p></div></CardContent></Card>
        <Card className="border-border/40"><CardContent className="flex items-center gap-3 p-4"><Receipt className="h-8 w-8 text-amber-500" /><div><p className="text-xs text-muted-foreground">Annual Est.</p><p className="text-lg font-bold">{fmt(totalMonthly * 12)}</p></div></CardContent></Card>
      </div>

      {/* Bills Table with Payment Grid */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Payment Tracker</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[160px]">Bill</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Freq.</TableHead>
                {MONTH_SHORT.map((m) => <TableHead key={m} className="text-center text-xs">{m}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id} className="group">
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">{bill.description}</TableCell>
                  <TableCell className="text-right">{fmt(bill.amount)}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{bill.frequency}</Badge></TableCell>
                  {MONTH_SHORT.map((_, i) => {
                    const payment = bill.payments.find((p) => p.month === i + 1);
                    const paid = payment?.paid ?? false;
                    return (
                      <TableCell key={i} className="text-center">
                        {paid ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="mx-auto h-4 w-4 text-muted-foreground/30" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
