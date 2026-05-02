import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { postAuthRedirectPath } from '@/lib/userRole';
import Layout, { PageHeader } from '@/components/layout/Layout';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Badge';

export default function RegisterPage() {
  const { register, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(postAuthRedirectPath(user), { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const r = await register({
        email: email.trim(),
        password,
        password2,
        full_name: fullName.trim() || undefined,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      navigate(postAuthRedirectPath(r.user), { replace: true });
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
          title="Create your account"
          subtitle="Join Kryptera to send money and track transfers in one place."
        />

        <Card elevated style={{ marginTop: 8 }}>
          <CardContent className='pt-7'>
          {error ? (
            <div style={{ marginBottom: 20 }}>
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Input
              label="Full name"
              type="text"
              name="name"
              autoComplete="name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Mary Phiri"
              hint="Optional — you can add this later in your profile."
            />
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="meme@example.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              hint="Use at least 8 characters."
            />
            <Input
              label="Confirm password"
              type="password"
              name="password2"
              autoComplete="new-password"
              required
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              placeholder="Repeat password"
            />

            <Button type="submit" size="lg" fullWidth loading={busy}>
              Create account
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
            Already have an account?{' '}
            <Link
              to={ROUTES.login}
              style={{
                fontWeight: 600,
                color: 'var(--color-primary-dark)',
              }}
            >
              Sign in
            </Link>
          </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
