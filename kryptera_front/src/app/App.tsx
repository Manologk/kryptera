import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { RatesProvider } from '@/context/RatesContext';
import PublicLayout from '@/components/layout/PublicLayout';
import AdminShell from '@/pages/admin/AdminShell';
import ConverterPage from '@/pages/ConverterPage';
import ActivityPage from '@/pages/ActivityPage';
import TransactionDetailPage from '@/pages/TransactionDetailPage';
import RecipientsPage from '@/pages/RecipientsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminRatesPage from '@/pages/admin/AdminRatesPage';
import AdminCurrenciesPage from '@/pages/admin/AdminCurrenciesPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminTransactionsPage from '@/pages/admin/AdminTransactionsPage';
import AdminTransactionDetailPage from '@/pages/admin/AdminTransactionDetailPage';
import AdminPendingTransactionsPage from '@/pages/admin/AdminPendingTransactionsPage';
import AdminPendingTransactionDetailPage from '@/pages/admin/AdminPendingTransactionDetailPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import TransferPage from '@/pages/TransferPage';
import TransferConfirmationPage from '@/pages/TransferConfirmationPage';
import { ROUTES } from '@/constants/routes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RatesProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path={ROUTES.home} element={<ConverterPage />} />
              <Route path="/transfer/:txId/confirmation" element={<TransferConfirmationPage />} />
              <Route path={ROUTES.transfer} element={<TransferPage />} />
              <Route path={ROUTES.activity} element={<ActivityPage />} />
              <Route path="/activity/:id" element={<TransactionDetailPage />} />
              <Route path={ROUTES.recipients} element={<RecipientsPage />} />
              <Route path={ROUTES.login} element={<LoginPage />} />
              <Route path={ROUTES.register} element={<RegisterPage />} />
            </Route>

            <Route path={ROUTES.admin} element={<AdminShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="overview" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="rates" element={<AdminRatesPage />} />
              <Route path="currencies" element={<AdminCurrenciesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="transactions/:id" element={<AdminTransactionDetailPage />} />
              <Route path="pending" element={<AdminPendingTransactionsPage />} />
              <Route path="pending/:id" element={<AdminPendingTransactionDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Routes>
        </RatesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
