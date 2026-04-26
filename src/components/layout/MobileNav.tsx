import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, Church } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import {
  navEntries, isGroup, useGroupOpen, GroupHeader, LeafLink,
} from './nav-config';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
            <Church className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold">LGGM</span>
            <p className="text-[10px] text-muted-foreground">Ledger of Harvest</p>
          </div>
        </div>
        <Separator />
        <nav className="space-y-1 p-3">
          {navEntries.map((entry) =>
            isGroup(entry)
              ? <MobileGroup key={entry.id} group={entry} onNavigate={close} />
              : <LeafLink key={entry.to} leaf={entry} onNavigate={close} />,
          )}
        </nav>
        <Separator />
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive"
            onClick={() => { logout(); navigate('/login'); close(); }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileGroup({
  group, onNavigate,
}: {
  group: import('./nav-config').NavGroup;
  onNavigate: () => void;
}) {
  const { pathname } = useLocation();
  const containsActive = group.children.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useGroupOpen(group);

  return (
    <div className="space-y-1">
      <GroupHeader group={group} open={open} onToggle={() => setOpen(!open)} containsActive={containsActive} />
      {open && (
        <div className="space-y-0.5">
          {group.children.map((leaf) => (
            <LeafLink key={leaf.to} leaf={leaf} nested onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}
