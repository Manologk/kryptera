import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { CONTACT_INFO } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { isKycVerified } from '@/lib/kyc';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

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

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTransfers({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h11m0 0-3-3m3 3-3 3M20 12H9m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRecipients({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tabInactive = 'border-transparent text-[var(--kryptera-muted)]';
const tabActive = 'border-[var(--kryptera-dark)] text-[var(--kryptera-dark)]';

export default function Nav() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileAccountRef = useRef<HTMLDivElement>(null);

  const ini = initialsFromUser(user ?? null);
  const showKycLink = isAuthenticated && user && !user.isAdmin && !isKycVerified(user);

  const accountTo = isAuthenticated ? ROUTES.activity : ROUTES.login;

  const accountTabActive =
    mobileAccountOpen ||
    (isAuthenticated &&
      (pathname === ROUTES.activity || pathname.startsWith(`${ROUTES.activity}/`))) ||
    (!isAuthenticated && (pathname === ROUTES.login || pathname === ROUTES.register));

  useEffect(() => {
    setMobileAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuOpen && !menuRef.current?.contains(target)) setMenuOpen(false);
      if (mobileAccountOpen && !mobileAccountRef.current?.contains(target)) setMobileAccountOpen(false);
    };
    if (menuOpen || mobileAccountOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuOpen, mobileAccountOpen]);

  const helpHref = `mailto:${CONTACT_INFO.email}`;

  const avatarClass =
    'flex shrink-0 items-center justify-center rounded-full bg-[var(--kryptera-green)] font-semibold text-[var(--kryptera-dark)]';

  return (
    <>
      <header className="sticky top-0 z-[60] w-full bg-[var(--kryptera-dark)] text-white">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 lg:h-16 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-7">
            <Link
              to={ROUTES.home}
              className="shrink-0 font-bold lowercase tracking-tight text-white text-[18px] lg:text-[20px]"
            >
              kryptera
            </Link>

            <nav className="hidden min-w-0 items-center gap-7 lg:flex" aria-label="Main">
              <NavLink
                to={ROUTES.home}
                end
                className={({ isActive }) =>
                  cn(
                    'shrink-0 text-[13px] font-normal transition-colors',
                    isActive
                      ? 'text-[var(--kryptera-green)] underline decoration-2 underline-offset-8'
                      : 'text-white hover:text-white/90',
                  )
                }
              >
                Send
              </NavLink>
              <NavLink
                to={ROUTES.activity}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 text-[13px] font-normal transition-colors',
                    isActive || pathname.startsWith(`${ROUTES.activity}/`)
                      ? 'text-[var(--kryptera-green)] underline decoration-2 underline-offset-8'
                      : 'text-white hover:text-white/90',
                  )
                }
              >
                Transactions
              </NavLink>
              <NavLink
                to={ROUTES.recipients}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 text-[13px] font-normal transition-colors',
                    isActive
                      ? 'text-[var(--kryptera-green)] underline decoration-2 underline-offset-8'
                      : 'text-white hover:text-white/90',
                  )
                }
              >
                Recipients
              </NavLink>
              {showKycLink ? (
                <NavLink
                  to={ROUTES.kyc}
                  className={({ isActive }) =>
                    cn(
                      'shrink-0 text-[13px] font-normal transition-colors',
                      isActive
                        ? 'text-[var(--kryptera-green)] underline decoration-2 underline-offset-8'
                        : 'text-amber-200 hover:text-amber-100',
                    )
                  }
                >
                  Verification
                </NavLink>
              ) : null}
              <a
                href={helpHref}
                className="shrink-0 text-[13px] font-normal text-white hover:text-white/90"
              >
                Help
              </a>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1 lg:gap-2">
            {loading ? (
              <span className="text-xs text-white/70" aria-hidden>
                …
              </span>
            ) : (
              <>
                <Link
                  to={accountTo}
                  className={cn('flex lg:hidden', avatarClass)}
                  style={{ width: 36, height: 36, fontSize: 13 }}
                  aria-label={isAuthenticated ? 'Account' : 'Sign in'}
                >
                  {ini}
                </Link>

                <div className="relative hidden lg:block" ref={menuRef}>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md p-1 text-white hover:bg-white/10"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMenuOpen(o => !o)}
                  >
                    <span className={cn(avatarClass)} style={{ width: 40, height: 40, fontSize: 14 }}>
                      {ini}
                    </span>
                    <ChevronDown
                      className={cn('opacity-90 transition-transform', menuOpen && 'rotate-180')}
                    />
                  </button>

                  {menuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-[80] mt-2 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--kryptera-border)] bg-[var(--kryptera-card)] py-1 shadow-lg"
                    >
                      {isAuthenticated ? (
                        <>
                          <Link
                            role="menuitem"
                            to={ROUTES.activity}
                            className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                            onClick={() => setMenuOpen(false)}
                          >
                            Profile
                          </Link>
                          <Link
                            role="menuitem"
                            to={ROUTES.recipients}
                            className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                            onClick={() => setMenuOpen(false)}
                          >
                            Settings
                          </Link>
                          {showKycLink ? (
                            <Link
                              role="menuitem"
                              to={ROUTES.kyc}
                              className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                              onClick={() => setMenuOpen(false)}
                            >
                              Verification
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full px-4 py-2.5 text-left text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                            onClick={() => {
                              setMenuOpen(false);
                              logout();
                            }}
                          >
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            role="menuitem"
                            to={ROUTES.login}
                            className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                            onClick={() => setMenuOpen(false)}
                          >
                            Sign in
                          </Link>
                          <Link
                            role="menuitem"
                            to={ROUTES.register}
                            className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                            onClick={() => setMenuOpen(false)}
                          >
                            Create account
                          </Link>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 grid h-[60px] grid-cols-4 overflow-visible border-t border-[var(--kryptera-border)] bg-[var(--kryptera-card)] pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        aria-label="Primary"
      >
        <NavLink
          to={ROUTES.home}
          end
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 border-t-2 pt-0.5 text-[10px] font-medium leading-tight',
              isActive ? tabActive : tabInactive,
            )
          }
        >
          <IconHome className="shrink-0" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to={ROUTES.activity}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 border-t-2 pt-0.5 text-[10px] font-medium leading-tight',
              isActive ? tabActive : tabInactive,
            )
          }
        >
          <IconTransfers className="shrink-0" />
          <span>Transfers</span>
        </NavLink>

        <NavLink
          to={ROUTES.recipients}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 border-t-2 pt-0.5 text-[10px] font-medium leading-tight',
              isActive ? tabActive : tabInactive,
            )
          }
        >
          <IconRecipients className="shrink-0" />
          <span>Recipients</span>
        </NavLink>

        <div ref={mobileAccountRef} className="relative flex min-h-0 min-w-0 justify-center overflow-visible">
          <button
            type="button"
            className={cn(
              'flex w-full max-w-[100px] flex-col items-center justify-center gap-0.5 border-t-2 border-transparent pt-0.5 text-[10px] font-medium leading-tight transition-colors',
              accountTabActive ? tabActive : tabInactive,
            )}
            aria-expanded={mobileAccountOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            onClick={() => setMobileAccountOpen(o => !o)}
          >
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-[var(--kryptera-green)] font-semibold text-[var(--kryptera-dark)]',
              )}
              style={{ width: 20, height: 20, fontSize: 8, lineHeight: 1 }}
            >
              {ini}
            </span>
            <span>Account</span>
          </button>

          {mobileAccountOpen ? (
            <div
              role="menu"
              className="absolute bottom-full left-1/2 z-[60] mb-2 w-[min(calc(100vw-24px),280px)] -translate-x-1/2 rounded-[var(--radius-md)] border border-[var(--kryptera-border)] bg-[var(--kryptera-card)] py-1 shadow-lg animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            >
              {isAuthenticated ? (
                <>
                  <Link
                    role="menuitem"
                    to={ROUTES.activity}
                    className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                    onClick={() => setMobileAccountOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    role="menuitem"
                    to={ROUTES.recipients}
                    className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                    onClick={() => setMobileAccountOpen(false)}
                  >
                    Settings
                  </Link>
                  {showKycLink ? (
                    <Link
                      role="menuitem"
                      to={ROUTES.kyc}
                      className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                      onClick={() => setMobileAccountOpen(false)}
                    >
                      Verification
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                    onClick={() => {
                      setMobileAccountOpen(false);
                      logout();
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    role="menuitem"
                    to={ROUTES.login}
                    className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                    onClick={() => setMobileAccountOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    role="menuitem"
                    to={ROUTES.register}
                    className="block px-4 py-2.5 text-sm text-[var(--kryptera-dark)] hover:bg-[var(--kryptera-surface)]"
                    onClick={() => setMobileAccountOpen(false)}
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>
      </nav>
    </>
  );
}
