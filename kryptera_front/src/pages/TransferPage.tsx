import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import Layout, { PageHeader } from '@/components/layout/Layout';
import TransferWizard from '@/features/transfer/TransferWizard';

export default function TransferPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Layout maxWidth={560}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>Loading…</p>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout maxWidth={560}>
        <PageHeader title="Send money" subtitle="Sign in to continue your transfer." />
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
          You need an account to send money through Kryptera.
        </p>
        <Link
          to={ROUTES.login}
          state={{ from: ROUTES.transfer }}
          style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}
        >
          Sign in
        </Link>
        {' · '}
        <Link
          to={ROUTES.register}
          state={{ from: ROUTES.transfer }}
          style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}
        >
          Create an account
        </Link>
      </Layout>
    );
  }

  return <TransferWizard />;
}
