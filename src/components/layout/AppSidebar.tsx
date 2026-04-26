import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Church,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  navEntries, isGroup, useGroupOpen, GroupHeader, LeafLink,
} from './nav-config';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
          <Church className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">LGGM</span>
            <span className="truncate text-[10px] text-muted-foreground">Ledger of Harvest</span>
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navEntries.map((entry) =>
          isGroup(entry)
            ? <SidebarGroup key={entry.id} group={entry} collapsed={collapsed} />
            : <LeafLink key={entry.to} leaf={entry} collapsed={collapsed} />,
        )}
      </nav>

      <Separator className="opacity-50" />

      {/* Bottom */}
      <div className="space-y-2 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-2')}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </Button>

        <div className={cn('flex items-center gap-3 rounded-lg bg-accent/50 p-2', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-[11px] font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-foreground">{user?.full_name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}

function SidebarGroup({
  group, collapsed,
}: {
  group: import('./nav-config').NavGroup;
  collapsed: boolean;
}) {
  const { pathname } = useLocation();
  const containsActive = group.children.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useGroupOpen(group);

  // When the rail is collapsed, render children inline (always visible) without the chevron header.
  if (collapsed) {
    return (
      <div className="space-y-1">
        <GroupHeader group={group} open={true} onToggle={() => undefined} collapsed containsActive={containsActive} />
        {group.children.map((leaf) => (
          <LeafLink key={leaf.to} leaf={leaf} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <GroupHeader group={group} open={open} onToggle={() => setOpen(!open)} containsActive={containsActive} />
      {open && (
        <div className="space-y-0.5">
          {group.children.map((leaf) => (
            <LeafLink key={leaf.to} leaf={leaf} nested />
          ))}
        </div>
      )}
    </div>
  );
}
