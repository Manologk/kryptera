import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import RequireAdmin from '@/pages/admin/RequireAdmin';

const NAV_LINKS = [
  { to: 'dashboard', label: 'Dashboard' },
  { to: 'users', label: 'Users' },
  { to: 'transactions', label: 'Transactions' },
  { to: 'rates', label: 'Rates' },
  { to: 'currencies', label: 'Currencies' },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV_LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <div className="border-b border-border px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
            <p className="text-sm font-bold text-foreground">Kryptera</p>
          </div>
          <NavItems />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4">
            <div className="flex items-center gap-2 md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="border-b border-border px-4 py-4 text-left">
                    <SheetTitle className="text-base">Admin menu</SheetTitle>
                  </SheetHeader>
                  <NavItems onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <span className="text-sm font-semibold">Admin</span>
            </div>

            <div className="hidden min-w-0 flex-1 md:block">
              <h1 className="truncate text-sm font-semibold text-muted-foreground">Operations</h1>
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span
                className="hidden max-w-[200px] truncate text-xs text-muted-foreground sm:block sm:text-sm"
                title={user?.email}
              >
                {user?.email}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}
