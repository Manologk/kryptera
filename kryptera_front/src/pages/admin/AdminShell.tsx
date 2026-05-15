import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants/routes';
import { adminKeys } from '@/features/admin/queryKeys';
import { getAdminDashboardStats } from '@/services/api';
import type { User } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import RequireAdmin from '@/pages/admin/RequireAdmin';

function initialsFromUser(user: User | null): string {
  if (!user) return '?';
  const n = user.fullName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = user.email.split('@')[0] ?? '?';
  return local.slice(0, 2).toUpperCase();
}

const ADMIN_BG = '#0d0d0d';
const ADMIN_NAV_BG = '#1a1a1a';
const ADMIN_BORDER = '#333';
const dashPath = `${ROUTES.admin}/dashboard`;
const transactionsPath = `${ROUTES.admin}/transactions`;
const usersPath = `${ROUTES.admin}/users`;
const settingsPath = `${ROUTES.admin}/rates`;

function IconDashboard({ className, active }: { className?: string; active?: boolean }) {
  const c = active ? '#fff' : '#666';
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1v5H4V5Zm10 0h4a1 1 0 0 1 1v5h-6V5ZM4 13h6v6H5a1 1 0 0 1-1-1v-5Zm8 0h6v5a1 1 0 0 1-1 1h-5v-6Z"
        stroke={c}
        strokeWidth={1.5}
      />
    </svg>
  );
}

function IconPending({ className, active }: { className?: string; active?: boolean }) {
  const c = active ? '#fff' : '#666';
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth={1.5} />
      <path d="M12 7v6l4 2" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconTransactions({ className, active }: { className?: string; active?: boolean }) {
  const c = active ? '#fff' : '#666';
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h9" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ className, active }: { className?: string; active?: boolean }) {
  const c = active ? '#fff' : '#666';
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={c}
        strokeWidth={1.5}
      />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.61V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.61 1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.61-1h-.09a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.61-1 1.7 1.7 0 0 0-.34-1.87l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.61V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.61 1.7 1.7 0 0 0 1.87-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.61 1h.09a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.61 1Z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminShell() {
  const { user, logout, accessToken } = useAuth();
  const ini = initialsFromUser(user ?? null);

  const statsQuery = useQuery({
    queryKey: adminKeys.stats,
    enabled: Boolean(accessToken),
    queryFn: async () => {
      const res = await getAdminDashboardStats(accessToken!);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const awaitingConfirmationN = statsQuery.data?.transactionsByStatus?.awaiting_confirmation ?? 0;
  const awaitingLabel = `${awaitingConfirmationN} awaiting`;

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-background">
        {/* Mobile top bar */}
        <header
          className="fixed left-0 right-0 top-0 z-[70] flex h-14 items-center justify-between px-4 lg:hidden"
          style={{ backgroundColor: ADMIN_BG }}
        >
          <Link to={dashPath} className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[18px] font-bold lowercase text-white">kryptera</span>
            <span
              className="shrink-0 rounded-[var(--radius-sm)] font-medium"
              style={{
                fontSize: 10,
                padding: '2px 6px',
                background: '#333',
                color: '#aaa',
              }}
            >
              admin
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className="max-w-[72px] truncate text-xs font-medium sm:max-w-[120px]"
              style={{ color: 'var(--kryptera-pending)' }}
              title={awaitingLabel}
            >
              {statsQuery.isLoading ? '…' : awaitingLabel}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[#ccc] transition-colors hover:border-[#666] hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kryptera-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
              style={{ borderColor: ADMIN_BORDER }}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
              style={{
                background: 'var(--kryptera-green)',
                color: 'var(--kryptera-dark)',
              }}
              title={user?.email}
              aria-label={user?.email ? `Signed in as ${user.email}` : 'Account'}
            >
              {ini}
            </span>
          </div>
        </header>

        {/* Desktop sidebar */}
        <aside
          className="fixed bottom-0 left-0 top-0 z-[60] hidden w-[220px] flex-col lg:flex"
          style={{ backgroundColor: ADMIN_BG }}
        >
          <div className="border-b px-4 py-5" style={{ borderColor: ADMIN_BORDER }}>
            <p className="text-[15px] font-bold lowercase leading-tight text-white">kryptera admin</p>
          </div>

          <nav className="flex flex-1 flex-col gap-0 py-3" aria-label="Admin">
            <NavLink
              to={dashPath}
              end
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center px-4 text-sm transition-colors',
                  isActive
                    ? 'border-l-[3px] border-[var(--kryptera-green)] bg-[#1f1f1f] font-medium text-white'
                    : 'border-l-[3px] border-transparent text-[#888] hover:bg-[#1a1a1a]',
                )
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to={transactionsPath}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center px-4 text-sm transition-colors',
                  isActive
                    ? 'border-l-[3px] border-[var(--kryptera-green)] bg-[#1f1f1f] font-medium text-white'
                    : 'border-l-[3px] border-transparent text-[#888] hover:bg-[#1a1a1a]',
                )
              }
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span>Transactions</span>
                {!statsQuery.isLoading ? (
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      color: 'var(--kryptera-pending)',
                      background: 'rgba(239, 159, 39, 0.12)',
                    }}
                  >
                    {awaitingConfirmationN}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <NavLink
              to={usersPath}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center px-4 text-sm transition-colors',
                  isActive
                    ? 'border-l-[3px] border-[var(--kryptera-green)] bg-[#1f1f1f] font-medium text-white'
                    : 'border-l-[3px] border-transparent text-[#888] hover:bg-[#1a1a1a]',
                )
              }
            >
              Users
            </NavLink>
            <NavLink
              to={settingsPath}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center px-4 text-sm transition-colors',
                  isActive
                    ? 'border-l-[3px] border-[var(--kryptera-green)] bg-[#1f1f1f] font-medium text-white'
                    : 'border-l-[3px] border-transparent text-[#888] hover:bg-[#1a1a1a]',
                )
              }
            >
              Rates Setup
            </NavLink>
          </nav>

          <div className="border-t p-4" style={{ borderColor: ADMIN_BORDER }}>
            <p className="truncate text-sm text-white" title={user?.email}>
              {user?.fullName?.trim() || user?.email}
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-2 text-sm font-medium text-[#aaa] underline-offset-2 hover:text-white hover:underline"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <div
          className={cn(
            'min-h-screen pt-14 pb-[72px]',
            'lg:ml-[220px] lg:pt-0 lg:pb-0',
          )}
        >
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </div>
        </div>

        {/* Mobile bottom tabs */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-[65] grid h-[60px] grid-cols-4 border-t lg:hidden"
          style={{ backgroundColor: ADMIN_NAV_BG, borderColor: ADMIN_BORDER }}
          aria-label="Admin primary"
        >
          <NavLink to={dashPath} end className="flex h-full w-full items-stretch justify-center">
            {({ isActive }) => (
              <div
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-tight',
                  isActive ? 'text-white' : 'text-[#666]',
                )}
              >
                <IconDashboard active={isActive} />
                <span>Dashboard</span>
              </div>
            )}
          </NavLink>
          <NavLink to={transactionsPath} className="flex h-full w-full items-stretch justify-center">
            {({ isActive }) => (
              <div
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-tight',
                  isActive ? 'text-white' : 'text-[#666]',
                )}
              >
                <IconTransactions active={isActive} />
                <span>Txns</span>
                {!statsQuery.isLoading && awaitingConfirmationN > 0 ? (
                  <span
                    className="absolute right-1 top-1 min-w-[14px] rounded-full px-0.5 text-center text-[9px] font-bold"
                    style={{
                      color: 'var(--kryptera-dark)',
                      background: 'var(--kryptera-pending)',
                    }}
                  >
                    {awaitingConfirmationN > 9 ? '9+' : awaitingConfirmationN}
                  </span>
                ) : null}
              </div>
            )}
          </NavLink>
          <NavLink to={usersPath} className="flex h-full w-full items-stretch justify-center">
            {({ isActive }) => (
              <div
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-tight',
                  isActive ? 'text-white' : 'text-[#666]',
                )}
              >
                <IconPending active={isActive} />
                <span>Users</span>
              </div>
            )}
          </NavLink>
          <NavLink to={settingsPath} className="flex h-full w-full items-stretch justify-center">
            {({ isActive }) => (
              <div
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-tight',
                  isActive ? 'text-white' : 'text-[#666]',
                )}
              >
                <IconSettings active={isActive} />
                <span>Rates</span>
              </div>
            )}
          </NavLink>
        </nav>
      </div>
    </RequireAdmin>
  );
}
