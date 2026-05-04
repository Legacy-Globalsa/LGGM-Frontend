import { useEffect, useState } from 'react';
import { User, Palette, Calendar, Save, Percent, RotateCcw, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import type { CurrencyCode } from '@/hooks/useCurrency';
import { useYear } from '@/hooks/useYear';
import {
  fetchYear, fetchYearOverrides, updateYear, upsertYearOverride, createYear,
} from '@/lib/api';
import {
  MONTH_SHORT, getMonthShort, type Year, type YearMonthOverride, type PctField,
} from '@/types';
import { cn } from '@/lib/utils';

const PCT_FIELDS: { key: PctField; label: string }[] = [
  { key: 'tithes_pct',         label: 'Tithes' },
  { key: 'offering_pct',       label: 'Offering' },
  { key: 'savings_pct',        label: 'Savings' },
  { key: 'first_fruit_pct',    label: 'First Fruit' },
  { key: 'other_expenses_pct', label: 'Other' },
];

type DraftOverrides = Record<number, Record<PctField, string>>; // month -> { field -> value or '' for fallback }

function blankRow(): Record<PctField, string> {
  return { tithes_pct: '', offering_pct: '', savings_pct: '', first_fruit_pct: '', other_expenses_pct: '' };
}

function buildDraft(overrides: YearMonthOverride[]): DraftOverrides {
  const draft: DraftOverrides = {};
  for (let m = 1; m <= 12; m++) draft[m] = blankRow();
  overrides.forEach((o) => {
    PCT_FIELDS.forEach(({ key }) => {
      const v = o[key];
      if (v != null) draft[o.month][key] = String(v);
    });
  });
  return draft;
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { selectedYear, availableYears, loading: yearLoading } = useYear();

  const [year, setYear] = useState<Year | null>(null);
  const [noYear, setNoYear] = useState(false);
  const [overrides, setOverrides] = useState<YearMonthOverride[]>([]);
  const [draft, setDraft] = useState<DraftOverrides>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingYear, setCreatingYear] = useState(false);
  const [newYearNumber, setNewYearNumber] = useState(String(new Date().getFullYear()));

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [sampleIncome, setSampleIncome] = useState('');
  const [yearDefaults, setYearDefaults] = useState({
    tithes_pct: '', offering_pct: '', savings_pct: '', first_fruit_pct: '', other_expenses_pct: '',
  });

  useEffect(() => {
    if (yearLoading) return;
    if (availableYears.length === 0) { setNoYear(true); setLoading(false); return; }
    setNoYear(false);
    setLoading(true);
    fetchYear(selectedYear)
      .then(async (y) => {
        setYear(y);
        setYearDefaults({
          tithes_pct: String(y.tithes_pct),
          offering_pct: String(y.offering_pct),
          savings_pct: String(y.savings_pct),
          first_fruit_pct: String(y.first_fruit_pct),
          other_expenses_pct: String(y.other_expenses_pct),
        });
        const ovr = await fetchYearOverrides(y.id);
        setOverrides(ovr);
        setDraft(buildDraft(ovr));
        setLoading(false);
      })
      .catch(() => { setNoYear(true); setLoading(false); });
  }, [selectedYear, availableYears, yearLoading]);

  const handleCreateYear = async () => {
    const num = parseInt(newYearNumber, 10);
    if (!num || num < 2000 || num > 2100) { toast.error('Enter a valid year (2000–2100)'); return; }
    setCreatingYear(true);
    try {
      await createYear({ year: num, is_active: true });
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create year');
    } finally {
      setCreatingYear(false);
    }
  };

  const setCell = (month: number, field: PctField, value: string) => {
    setDraft((prev) => ({ ...prev, [month]: { ...prev[month], [field]: value } }));
  };

  const clearMonth = (month: number) => {
    setDraft((prev) => ({ ...prev, [month]: blankRow() }));
  };

  const saveYearDefaults = async () => {
    if (!year) return;
    setSaving(true);
    try {
      const patch = Object.fromEntries(
        Object.entries(yearDefaults).map(([k, v]) => [k, parseFloat(v) || 0]),
      );
      await updateYear(year.id, patch);
      toast.success('Year defaults saved');
    } finally {
      setSaving(false);
    }
  };

  const saveOverrides = async () => {
    if (!year) return;
    setSaving(true);
    try {
      // Persist each month that differs from current overrides snapshot.
      for (let m = 1; m <= 12; m++) {
        const row = draft[m] ?? blankRow();
        const patch: Partial<YearMonthOverride> = { notes: '' };
        let touched = false;
        PCT_FIELDS.forEach(({ key }) => {
          const v = row[key].trim();
          patch[key] = v === '' ? null : (parseFloat(v) || 0);
          touched = touched || patch[key] !== null;
        });
        // Only upsert when at least one field is set OR an existing override needs to be cleared.
        const existing = overrides.find((o) => o.month === m);
        if (touched || existing) {
          await upsertYearOverride(year.id, m, patch);
        }
      }
      const ovr = await fetchYearOverrides(year.id);
      setOverrides(ovr);
      toast.success('Monthly overrides saved');
    } finally {
      setSaving(false);
    }
  };

  const sumDefaults = PCT_FIELDS.reduce((s, f) => s + (parseFloat(yearDefaults[f.key]) || 0), 0);

  const getEffectivePct = (m: number, field: PctField): number => {
    if (!year) return 0;
    const v = draft[m]?.[field]?.trim();
    return v !== '' && v != null ? (parseFloat(v) || 0) : (year[field] as number);
  };

  const getRowSum = (m: number) =>
    PCT_FIELDS.reduce((s, f) => s + getEffectivePct(m, f.key), 0);

  const sampleAmt = parseFloat(sampleIncome) || 0;
  const fmtAmt = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, appearance, and the distribution percentages used for {selectedYear}.
        </p>
      </div>

      {/* New-user: no year exists yet */}
      {noYear && (
        <Card className="border-violet-500/40 bg-violet-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-violet-500" /> Create Your First Financial Year
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="new-year">Year</Label>
              <Input
                id="new-year"
                className="w-32"
                value={newYearNumber}
                onChange={(e) => setNewYearNumber(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateYear}
              disabled={creatingYear}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              {creatingYear ? 'Creating…' : 'Create Year'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-violet-500" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="bg-muted/30" />
            </div>
          </div>
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
            <Save className="mr-2 h-4 w-4" /> Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Theme & Currency */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-violet-500" /> Appearance & Localization</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 max-w-xs">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Year Defaults */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-violet-500" /> Year Defaults — {selectedYear}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Default distribution percentages applied to every month unless overridden below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {PCT_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label className="text-xs">{f.label} %</Label>
                    <Input
                      type="number" min={0} max={100} step={0.1}
                      value={yearDefaults[f.key]}
                      onChange={(e) => setYearDefaults({ ...yearDefaults, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className={cn(
                'text-xs',
                Math.round(sumDefaults) === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
              )}>
                Total: {sumDefaults}% {Math.round(sumDefaults) !== 100 && '(should sum to 100%)'}
              </p>
              <Button onClick={saveYearDefaults} disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                <Save className="mr-2 h-4 w-4" /> Save Defaults
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-Month Overrides */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-violet-500" /> Monthly Percentage Overrides
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Leave a cell blank to use the year default. Override only the months that differ
            (e.g. a month where you gave less to offering).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading || !year ? (
            <Skeleton className="m-4 h-64 w-[calc(100%-2rem)]" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-card">Month</TableHead>
                  {PCT_FIELDS.map((f) => (
                    <TableHead key={f.key} className="text-center text-xs">
                      {f.label}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        default {year[f.key]}%
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[72px] text-center text-xs">Total %</TableHead>
                  <TableHead className="w-[60px] text-center">Reset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTH_SHORT.map((_, i) => {
                  const m = i + 1;
                  return (
                    <TableRow key={m}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium">{getMonthShort(m)}</TableCell>
                      {PCT_FIELDS.map((f) => {
                        const isOvr = (draft[m]?.[f.key]?.trim() ?? '') !== '';
                        return (
                          <TableCell key={f.key} className="p-1">
                            <Input
                              type="number" min={0} max={100} step={0.1}
                              placeholder={`${year[f.key]}`}
                              value={draft[m]?.[f.key] ?? ''}
                              onChange={(e) => setCell(m, f.key, e.target.value)}
                              className={cn(
                                'h-8 w-[72px] text-center text-xs',
                                isOvr && 'border-violet-400 bg-violet-50 dark:bg-violet-950/30',
                              )}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {(() => {
                          const total = Math.round(getRowSum(m) * 10) / 10;
                          return (
                            <span className={cn(
                              'text-xs font-semibold tabular-nums',
                              Math.round(total) === 100
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400',
                            )}>
                              {total}%
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => clearMonth(m)}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Income Distribution Preview */}
          <div className="space-y-3 px-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs">Preview with sample monthly income:</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 8500"
                value={sampleIncome}
                onChange={(e) => setSampleIncome(e.target.value)}
                className="h-8 w-32 text-xs"
              />
              {sampleAmt > 0 && (
                <span className="text-xs text-muted-foreground">
                  Showing {currency} {fmtAmt(sampleAmt)}/month distribution
                </span>
              )}
            </div>
            {sampleAmt > 0 && !loading && year && (
              <div className="overflow-x-auto rounded border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs">Month</TableHead>
                      {PCT_FIELDS.map((f) => (
                        <TableHead key={f.key} className="text-center text-xs">{f.label}</TableHead>
                      ))}
                      <TableHead className="text-center text-xs font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MONTH_SHORT.map((_, i) => {
                      const m = i + 1;
                      const rowSum = getRowSum(m);
                      return (
                        <TableRow key={m} className="text-xs">
                          <TableCell className="font-medium">{getMonthShort(m)}</TableCell>
                          {PCT_FIELDS.map((f) => {
                            const pct = getEffectivePct(m, f.key);
                            const amt = (sampleAmt * pct) / 100;
                            const isOvr = (draft[m]?.[f.key]?.trim() ?? '') !== '';
                            return (
                              <TableCell
                                key={f.key}
                                className={cn(
                                  'text-center',
                                  isOvr
                                    ? 'font-medium text-violet-600 dark:text-violet-400'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {fmtAmt(amt)}
                              </TableCell>
                            );
                          })}
                          <TableCell
                            className={cn(
                              'text-center font-semibold',
                              Math.round(rowSum) === 100
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {fmtAmt((sampleAmt * rowSum) / 100)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />
          <div className="flex justify-end p-4">
            <Button onClick={saveOverrides} disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <Save className="mr-2 h-4 w-4" /> Save Overrides
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
