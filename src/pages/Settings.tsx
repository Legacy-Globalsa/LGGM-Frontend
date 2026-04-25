import { useState } from 'react';
import { User, Palette, Calendar, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email] = useState(user?.email ?? '');
  const [yearConfig, setYearConfig] = useState({
    year: '2026', tithes: '10', offering: '5', savings: '20', firstFruit: '5', other: '60',
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-violet-500" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={email} disabled className="bg-muted/30" /></div>
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Save className="mr-2 h-4 w-4" /> Save Profile</Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-violet-500" /> Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
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
        </CardContent>
      </Card>

      {/* Year Configuration */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-violet-500" /> Year Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Active Year</Label><Input value={yearConfig.year} onChange={(e) => setYearConfig({ ...yearConfig, year: e.target.value })} /></div>
          <Separator />
          <p className="text-sm font-medium">Distribution Percentages</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { key: 'tithes', label: 'Tithes %' },
              { key: 'offering', label: 'Offering %' },
              { key: 'savings', label: 'Savings %' },
              { key: 'firstFruit', label: 'First Fruit %' },
              { key: 'other', label: 'Other Expenses %' },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  type="number"
                  value={yearConfig[field.key as keyof typeof yearConfig]}
                  onChange={(e) => setYearConfig({ ...yearConfig, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
}
