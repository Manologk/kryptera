import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import Layout, { PageHeader } from '@/components/layout/Layout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Badge';

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.home;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, from]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await login(email.trim(), password);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      navigate(from, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <Layout maxWidth={440}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout maxWidth={440}>
      <div className="animate-fade-up">
        <PageHeader
          title="Welcome back"
          subtitle="Sign in to sync transfers and view your activity."
        />

        <Card elevated style={{ marginTop: 8 }}>
          {error ? (
            <div style={{ marginBottom: 20 }}>
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button type="submit" size="lg" fullWidth loading={busy}>
              Sign in
            </Button>
          </form>

          <p
            style={{
              marginTop: 24,
              marginBottom: 0,
              fontSize: 14,
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            New to CryptoFlux?{' '}
            <Link
              to={ROUTES.register}
              state={location.state}
              style={{
                fontWeight: 600,
                color: 'var(--color-primary-dark)',
              }}
            >
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </Layout>
  );
}
