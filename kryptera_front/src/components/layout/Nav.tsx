import type { CSSProperties } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  authOnly?: boolean;
  /** When set, item is "active" if pathname equals `to` or starts with this prefix (e.g. all `/admin/*`). */
  activePathPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.home, label: 'Convert', icon: '⇄' },
  { to: ROUTES.activity, label: 'Activity', icon: '📋' },
  { to: ROUTES.recipients, label: 'Recipients', icon: '👤', authOnly: true },
  { to: ROUTES.adminDashboard, label: 'Admin', icon: '⚙', adminOnly: true, activePathPrefix: ROUTES.admin },
];

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 600,
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  textDecoration: 'none',
  transition: 'all 150ms ease',
  fontFamily: 'var(--font-body)',
};

export default function Nav() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { pathname } = useLocation();

  return (
    <header
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <NavLink
          to={ROUTES.home}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            ⇄
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: 'var(--color-text)',
              letterSpacing: '-0.3px',
            }}
          >
            Kryptera
          </span>
        </NavLink>

        <nav style={{ display: 'flex', gap: 4, flex: '1 1 auto', justifyContent: 'center' }}>
          {NAV_ITEMS.filter(item => {
            if (item.adminOnly && !user?.isAdmin) return false;
            if (item.authOnly && !isAuthenticated) return false;
            return true;
          }).map(({ to, label, icon, activePathPrefix }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.home}
              style={({ isActive }) => {
                const active =
                  isActive ||
                  (activePathPrefix != null &&
                    (pathname === activePathPrefix || pathname.startsWith(`${activePathPrefix}/`)));
                return {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 150ms ease',
                  background: active ? 'var(--color-primary-subtle)' : 'transparent',
                  color: active ? '#166534' : 'var(--color-text-muted)',
                };
              }}
            >
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {loading ? (
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>…</span>
          ) : isAuthenticated && user ? (
            <>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                }}
                title={user.email}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                style={{
                  ...btnBase,
                  border: '1.5px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                style={{
                  ...btnBase,
                  border: '1.5px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                }}
              >
                Log in
              </Link>
              <Link
                to={ROUTES.register}
                style={{
                  ...btnBase,
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'var(--color-text)',
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
