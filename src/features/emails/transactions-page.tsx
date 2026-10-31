import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/misc';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { MAX_PENDING_STATUS_REFRESHES, usePendingTransactionStatus, useTransactions } from '@/hooks/use-email-queries';
import { getTransactionOperation, type TransactionOperation } from '@/lib/auth-session';
import { toApiError } from '@/lib/api-errors';
import { isPendingTransactionStatus } from '@/services/normalizers';
import type { TransactionStatus } from '@/types/api';

const PAGE_SIZES = [5, 10, 25];

const OPERATION_LABELS: Record<TransactionOperation, string> = {
  'single-email': 'Add a single email',
  'multiple-emails': 'Add multiple emails',
  'excel-import': 'Upload Excel file (multiple emails)',
};

function transactionOperationLabel(transaction: TransactionStatus): string {
  const providedOperation = transaction.operation?.trim();
  if (providedOperation) return providedOperation;

  const savedOperation = getTransactionOperation(transaction.tid);
  if (savedOperation) return OPERATION_LABELS[savedOperation];

  const url = transaction.url?.toLowerCase().split('?')[0] ?? '';
  if (url.endsWith('/api/emails/import-excel')) return OPERATION_LABELS['excel-import'];
  if (url.endsWith('/api/emails/add')) return 'Add email(s)';
  return '—';
}

function statusTone(transaction: TransactionStatus): 'green' | 'rose' | 'amber' | 'slate' {
  if (transaction.isFailure) return 'rose';
  if (transaction.isTerminal) return 'green';
  if (transaction.status) return 'amber';
  return 'slate';
}

function TransactionStatusCell({ transaction }: { transaction: TransactionStatus }) {
  return isPendingTransactionStatus(transaction.status)
    ? <PendingTransactionStatusCell transaction={transaction} />
    : <StaticTransactionStatusCell transaction={transaction} />;
}

function StaticTransactionStatusCell({ transaction }: { transaction: TransactionStatus }) {
  return (
    <div className="min-w-40">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(transaction)}>{transaction.status ?? 'Unknown'}</Badge>
        {transaction.statusCode !== null && <span className="text-xs text-slate-500">HTTP {transaction.statusCode}</span>}
      </div>
      {transaction.message && <p className="mt-1 max-w-sm text-xs text-slate-600">{transaction.message}</p>}
    </div>
  );
}

function PendingTransactionStatusCell({ transaction }: { transaction: TransactionStatus }) {
  const query = usePendingTransactionStatus(transaction);
  const current = query.data ?? transaction;
  const tone = statusTone(current);

  return (
    <div className="min-w-40 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{current.status ?? 'Unknown'}</Badge>
        {current.statusCode !== null && <span className="text-xs text-slate-500">HTTP {current.statusCode}</span>}
      </div>
      {current.message && <p className="max-w-sm text-xs text-slate-600">{current.message}</p>}
      {!current.isTerminal && query.refreshCount < MAX_PENDING_STATUS_REFRESHES && (
        <p className="text-xs text-slate-400">
          <Clock3 className="mr-1 inline h-3 w-3" aria-hidden />
          Auto-check {query.refreshCount}/{MAX_PENDING_STATUS_REFRESHES} over 2 minutes
        </p>
      )}
      {!current.isTerminal && query.refreshCount >= MAX_PENDING_STATUS_REFRESHES && (
        <p className="text-xs text-amber-700">Still processing after 5 checks.</p>
      )}
      {query.isError && <p role="status" className="text-xs text-rose-600">Status refresh failed: {toApiError(query.error).message}</p>}
    </div>
  );
}

export function TransactionsPage() {
  const { user, userId, userIdError, retryUserIdLookup } = useAuth();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(5);
  const query = useTransactions(userId, page, size);
  const data = query.data;

  return (
    <>
      <PageHeader
        title="Transaction Status"
        description="Track the processing status of your email submissions and imports."
        actions={<Button variant="secondary" onClick={() => void query.refetch()} loading={query.isFetching} disabled={!userId}>
          {!query.isFetching && <RefreshCw className="h-4 w-4" aria-hidden />}Refresh
        </Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Your recent transactions</p>
            <p className="mt-1 text-xs text-slate-500">
              {data?.totalElements !== null && data?.totalElements !== undefined
                ? `${data.totalElements} total${data.items.filter((item) => isPendingTransactionStatus(item.status)).length ? ` · ${data.items.filter((item) => isPendingTransactionStatus(item.status)).length} pending on this page` : ''}`
                : 'Transactions are loaded from your account.'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <label htmlFor="transaction-page-size">Rows</label>
            <select
              id="transaction-page-size"
              value={size}
              onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
            >
              {PAGE_SIZES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        {!user?.email ? (
          <ErrorState message="Your signed-in account does not have an email address, so transactions cannot be loaded." />
        ) : !userId ? (
          userIdError ? (
            <ErrorState message={toApiError(userIdError).message} onRetry={() => void retryUserIdLookup()} />
          ) : (
            <div className="space-y-3 p-4" role="status" aria-label="Loading transactions">
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
            </div>
          )
        ) : query.isPending ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading transactions">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </div>
        ) : query.isError && !data ? (
          <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />
        ) : data?.items.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title="No transactions yet" description="Your email submissions and imports will appear here." />
        ) : data ? (
          <div className={`overflow-x-auto ${query.isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Transaction ID</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Request</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Operation</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((transaction) => (
                  <tr key={transaction.tid} className="align-top hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-4 font-mono font-medium text-slate-900">{transaction.tid}</td>
                    <td className="max-w-56 break-all px-4 py-4 text-slate-600">{transaction.url ?? '—'}</td>
                    <td className="px-4 py-4 text-slate-700">{transactionOperationLabel(transaction)}</td>
                    <td className="px-4 py-4"><TransactionStatusCell transaction={transaction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {query.isError && data && (
          <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Could not refresh the transaction list: {toApiError(query.error).message}
          </p>
        )}

        {data && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Page {data.page + 1}{data.totalPages !== null ? ` of ${Math.max(data.totalPages, 1)}` : ''}
              {data.totalElements !== null ? ` · ${data.totalElements} total` : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!data.hasPrevious || query.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                <ChevronLeft className="h-4 w-4" aria-hidden />Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={!data.hasNext || query.isFetching} onClick={() => setPage((current) => current + 1)}>
                Next<ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
