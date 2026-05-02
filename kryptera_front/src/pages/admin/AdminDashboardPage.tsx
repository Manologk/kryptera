import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { adminKeys } from '@/features/admin/queryKeys';
import { transactionStatusLabel } from '@/features/admin/transactionLabels';
import { getAdminDashboardStats, getAdminDashboardTimeseries } from '@/services/api';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const { accessToken } = useAuth();

  const statsQuery = useQuery({
    queryKey: adminKeys.stats,
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminDashboardStats(accessToken!);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const chartQuery = useQuery({
    queryKey: adminKeys.timeseries(30),
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminDashboardTimeseries(accessToken!, 30);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin to view the dashboard.</p>;
  }

  const stats = statsQuery.data;
  const chartData =
    chartQuery.data?.series.map(p => ({
      label: p.date ? String(p.date).slice(5) : '—',
      zmw: p.volumeZmw,
      rub: p.volumeRub,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Summary metrics and recent transaction volume.</p>
      </div>

      {statsQuery.isError && (
        <p className="text-sm text-destructive" role="alert">
          {(statsQuery.error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-border bg-muted/40 shadow-md">
              <CardHeader title={<Skeleton className="h-4 w-28" />} />
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card className="border border-border bg-muted/40 shadow-md">
              <CardHeader title="Users" subtitle="Registered accounts" />
              <CardContent>
                <p className="font-mono text-2xl font-bold">{stats.userCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-muted/40 shadow-md">
              <CardHeader title="Admins" />
              <CardContent>
                <p className="font-mono text-2xl font-bold">{stats.adminCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-muted/40 shadow-md">
              <CardHeader title="Transactions" subtitle="All time" />
              <CardContent>
                <p className="font-mono text-2xl font-bold">{stats.transactionTotal}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-muted/40 shadow-md">
              <CardHeader title="Pending verification" />
              <CardContent>
                <p className="font-mono text-2xl font-bold">{stats.pendingVerificationCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-muted/40 shadow-md">
              <CardHeader title="Total commission (ZMW)" subtitle="Sum of per-transfer commission in ZMW" />
              <CardContent>
                <p className="font-mono text-2xl font-bold">{stats.totalCommissionZmw}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-muted/40 shadow-md">
              <CardHeader title="Active currencies" subtitle="Enabled for public list" />
              <CardContent>
                <p className="font-mono text-2xl font-bold">{stats.enabledCurrencyCount}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {stats && (
        <Card>
          <CardHeader title="By status" subtitle="Transaction counts" />
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {Object.entries(stats.transactionsByStatus).map(([k, v]) => (
                <li key={k}>
                  <span className="font-medium text-foreground">
                    {transactionStatusLabel(k)}
                  </span>
                  : {v}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Input volume by currency (30 days)"
          subtitle="Daily sum of input_amount in ZMW vs RUB"
        />
        <CardContent className="h-72 w-full">
          {chartQuery.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartQuery.isError ? (
            <p className="text-sm text-destructive">{(chartQuery.error as Error).message}</p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number, name: string) => [
                    typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value,
                    name === 'zmw' ? 'ZMW volume' : 'RUB volume',
                  ]}
                  labelFormatter={(_, p) => (p[0]?.payload?.label != null ? String(p[0].payload.label) : '')}
                />
                <Legend
                  formatter={value => (value === 'zmw' ? 'ZMW' : 'RUB')}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="zmw" fill="hsl(160 54% 42%)" name="zmw" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rub" fill="hsl(82 100% 18%)" name="rub" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
