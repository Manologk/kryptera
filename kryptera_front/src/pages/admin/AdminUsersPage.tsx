import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_PAGE_SIZE } from '@/constants';
import { adminKeys } from '@/features/admin/queryKeys';
import { kycBadgeClass, kycStatusLabel } from '@/lib/kyc';
import { downloadAdminKycDocument, getAdminUsers, patchAdminUser, type AdminUserRow } from '@/services/api';
import type { KycStatus } from '@/types';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [suspendUser, setSuspendUser] = useState<AdminUserRow | null>(null);
  const [rejectUser, setRejectUser] = useState<AdminUserRow | null>(null);
  const [reason, setReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const listQuery = useQuery({
    queryKey: adminKeys.users(page, appliedSearch),
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminUsers(accessToken!, { search: appliedSearch || undefined, page });
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      const res = await patchAdminUser(accessToken!, id, body);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.count / ADMIN_PAGE_SIZE)) : 1;

  function applySearch() {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  }

  function openSuspend(u: AdminUserRow) {
    setSuspendUser(u);
    setReason('');
  }

  async function handleViewKycDoc(u: AdminUserRow) {
    if (!accessToken) return;
    const ok = await downloadAdminKycDocument(accessToken, u.id);
    if (!ok) toast.error('Could not download KYC document.');
  }

  function confirmKyc(u: AdminUserRow, status: KycStatus, rejectionReason?: string) {
    const body: Record<string, unknown> = { kyc_status: status };
    if (status === 'rejected' && rejectionReason?.trim()) {
      body.kyc_rejection_reason = rejectionReason.trim();
    }
    patchMutation.mutate(
      { id: u.id, body },
      {
        onSuccess: () => {
          toast.success(status === 'verified' ? 'KYC approved' : 'KYC rejected');
          setRejectUser(null);
          setRejectReason('');
        },
      },
    );
  }

  function confirmSuspend(days: number | null) {
    if (!suspendUser) return;
    const body: Record<string, unknown> = {
      suspended_until: days == null ? null : addDaysIso(days),
      suspension_reason: reason.trim() || undefined,
    };
    patchMutation.mutate(
      { id: suspendUser.id, body },
      {
        onSuccess: () => {
          toast.success(days == null ? 'Suspension cleared' : `Suspended (${days}d)`);
          setSuspendUser(null);
        },
      },
    );
  }

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin.</p>;
  }

  const rows = listQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Search by email or name. Deactivated users cannot obtain new tokens.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="user-search">Search</Label>
          <Input
            id="user-search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Email or name"
            onKeyDown={e => e.key === 'Enter' && applySearch()}
          />
        </div>
        <Button type="button" onClick={applySearch} disabled={listQuery.isFetching}>
          Search
        </Button>
      </div>

      <Card>
        <CardHeader title="Users" subtitle={`${listQuery.data?.count ?? '—'} total`} />
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : listQuery.isError ? (
            <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users match this search.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="text-foreground">{u.fullName ?? '—'}</span>
                      <span className="mx-1">·</span>
                      <Badge variant="outline" className={kycBadgeClass(u.kycStatus)}>
                        {kycStatusLabel(u.kycStatus)}
                      </Badge>
                      {u.isAdmin ? (
                        <>
                          <span className="mx-1">·</span>
                          <Badge variant="secondary" className="ml-1">
                            admin
                          </Badge>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {u.isActive === false ? (
                        <Badge variant="destructive">Inactive</Badge>
                      ) : u.suspendedUntil ? (
                        <Badge variant="outline">Suspended</Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!u.isAdmin ? (
                          <>
                            {u.kycStatus === 'pending' ? (
                              <>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={patchMutation.isPending}
                                  onClick={() => handleViewKycDoc(u)}
                                >
                                  View doc
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={patchMutation.isPending}
                                  onClick={() => confirmKyc(u, 'verified')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={patchMutation.isPending}
                                  onClick={() => {
                                    setRejectUser(u);
                                    setRejectReason('');
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : null}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={patchMutation.isPending}
                              onClick={() =>
                                patchMutation.mutate(
                                  { id: u.id, body: { is_active: !(u.isActive ?? true) } },
                                  {
                                    onSuccess: () => toast.success('User updated'),
                                  },
                                )
                              }
                            >
                              {u.isActive === false ? 'Activate' : 'Deactivate'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openSuspend(u)}
                            >
                              Suspend…
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {listQuery.data != null && totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!rejectUser} onOpenChange={open => !open && setRejectUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {rejectUser?.email} — optional reason shown to the user when they resubmit.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Document is blurry or expired"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={patchMutation.isPending}
              onClick={() => rejectUser && confirmKyc(rejectUser, 'rejected', rejectReason)}
            >
              Reject verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!suspendUser} onOpenChange={open => !open && setSuspendUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {suspendUser?.email} — set <code className="rounded bg-muted px-1">suspended_until</code> presets or clear
            suspension.
          </p>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Input
              id="suspend-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Shown internally / to user if your policy requires"
            />
          </div>
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => confirmSuspend(7)} disabled={patchMutation.isPending}>
              Suspend 7 days
            </Button>
            <Button type="button" variant="secondary" onClick={() => confirmSuspend(30)} disabled={patchMutation.isPending}>
              Suspend 30 days
            </Button>
            <Button type="button" variant="outline" onClick={() => confirmSuspend(null)} disabled={patchMutation.isPending}>
              Clear suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
