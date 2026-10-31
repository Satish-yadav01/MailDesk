import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Clock3, Filter, Inbox, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/misc';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { MAX_PENDING_STATUS_REFRESHES, usePendingTransactionStatus, useTransactions } from '@/hooks/use-email-queries';
import { getTransactionOperation, type TransactionOperation } from '@/lib/auth-session';
import { toApiError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { isPendingTransactionStatus } from '@/services/normalizers';
import type { TransactionStatus } from '@/types/api';

const PAGE_SIZES = [5, 10, 25];
const EMPTY_FILTER_VALUE = '__empty__';
const FILTER_POPUP_HEIGHT = 156;
const FILTER_POPUP_WIDTH = 224;
type FilterKey = 'tid' | 'url' | 'operation' | 'status';
type Filters = Partial<Record<FilterKey, string>>;
const FILTER_COLUMNS: { key: FilterKey; label: string }[] = [
  { key: 'tid', label: 'Transaction ID' },
  { key: 'url', label: 'Request' },
  { key: 'operation', label: 'Operation' },
  { key: 'status', label: 'Status' },
];

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

function transactionFilterValue(transaction: TransactionStatus, key: FilterKey): string {
  if (key === 'tid') return transaction.tid;
  if (key === 'url') return transaction.url ?? '';
  if (key === 'operation') {
    const operation = transactionOperationLabel(transaction);
    return operation === '—' ? '' : operation;
  }
  return transaction.status ?? '';
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
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);
  const filterButtonRefs = useRef<Partial<Record<FilterKey, HTMLButtonElement>>>({});
  const [filterPopupPosition, setFilterPopupPosition] = useState({ top: 0, left: 0 });
  const query = useTransactions(userId, page, size);
  const data = query.data;
  const rows = useMemo(() => {
    let items = data?.items ?? [];
    const term = search.trim().toLowerCase();
    if (term) {
      items = items.filter((transaction) => [
        transaction.tid,
        transaction.url,
        transactionOperationLabel(transaction),
        transaction.status,
        transaction.statusCode === null ? null : String(transaction.statusCode),
        transaction.message,
      ].some((value) => value?.toLowerCase().includes(term)));
    }
    return items.filter((transaction) => FILTER_COLUMNS.every(({ key }) => {
      const value = filters[key];
      if (!value) return true;
      const currentValue = transactionFilterValue(transaction, key);
      return value === EMPTY_FILTER_VALUE ? !currentValue : currentValue === value;
    }));
  }, [data, search, filters]);
  const optionsFor = (key: FilterKey) => [...new Set((data?.items ?? [])
    .map((transaction) => transactionFilterValue(transaction, key))
    .filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const setFilter = (key: FilterKey, value: string) => setFilters((current) => {
    const updated = { ...current };
    if (value) updated[key] = value;
    else delete updated[key];
    return updated;
  });
  const clearFilters = () => {
    setSearch('');
    setFilters({});
    setOpenFilter(null);
  };

  useEffect(() => {
    if (!openFilter) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      const clickedButton = Object.values(filterButtonRefs.current).some((button) => button?.contains(event.target as Node));
      if (!filterPopupRef.current?.contains(event.target) && !clickedButton) setOpenFilter(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenFilter(null);
    };
    const positionPopup = () => {
      const button = filterButtonRefs.current[openFilter];
      if (!button) return;
      const bounds = button.getBoundingClientRect();
      const top = bounds.bottom + FILTER_POPUP_HEIGHT + 8 > window.innerHeight
        ? Math.max(8, bounds.top - FILTER_POPUP_HEIGHT - 8)
        : bounds.bottom + 8;
      const popupWidth = Math.min(FILTER_POPUP_WIDTH, window.innerWidth - 16);
      const left = Math.min(Math.max(8, bounds.left), window.innerWidth - popupWidth - 8);
      setFilterPopupPosition({ top, left });
    };
    positionPopup();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
    };
  }, [openFilter]);

  const th = (key: FilterKey, label: string) => {
    const selected = filters[key] ?? '';
    const isOpen = openFilter === key;
    const popup = isOpen ? createPortal(
      <div
        ref={filterPopupRef}
        style={{
          position: 'fixed',
          top: filterPopupPosition.top,
          left: filterPopupPosition.left,
          width: Math.min(FILTER_POPUP_WIDTH, window.innerWidth - 16),
        }}
        className="z-50 min-h-[148px] max-h-[min(18rem,calc(100vh-1rem))] w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-left text-sm normal-case shadow-xl"
      >
        <label htmlFor={`transaction-filter-${key}`} className="mb-1.5 block text-xs font-medium text-slate-600">Filter {label.toLowerCase()}</label>
        <select
          id={`transaction-filter-${key}`}
          aria-label={`${label} filter`}
          value={selected}
          onChange={(event) => setFilter(key, event.target.value)}
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-500"
        >
          <option value="">All values</option>
          <option value={EMPTY_FILTER_VALUE}>No value</option>
          {optionsFor(key).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <button type="button" className="mt-2 text-xs font-medium text-brand-700 hover:text-brand-800" onClick={() => setFilter(key, '')}>Clear this filter</button>
      </div>,
      document.body,
    ) : null;
    return (
      <th scope="col" className="relative px-4 py-3 text-left font-medium">
        <div className="flex items-center gap-1">
          <button
            ref={(button) => {
              if (button) filterButtonRefs.current[key] = button;
              else delete filterButtonRefs.current[key];
            }}
            type="button"
            className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', selected && 'bg-brand-50 text-brand-700')}
            aria-label={`Filter by ${label}`}
            aria-expanded={isOpen}
            onClick={(event) => {
              if (isOpen) {
                setOpenFilter(null);
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              const top = bounds.bottom + FILTER_POPUP_HEIGHT + 8 > window.innerHeight
                ? Math.max(8, bounds.top - FILTER_POPUP_HEIGHT - 8)
                : bounds.bottom + 8;
              const popupWidth = Math.min(FILTER_POPUP_WIDTH, window.innerWidth - 16);
              const left = Math.min(Math.max(8, bounds.left), window.innerWidth - popupWidth - 8);
              setFilterPopupPosition({ top, left });
              setOpenFilter(key);
            }}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="font-medium uppercase tracking-wide">{label}</span>
        </div>
        {popup}
      </th>
    );
  };

  return (
    <>
      <PageHeader
        title="Transaction History"
        description="Track the processing status of your email submissions and imports."
        actions={<Button variant="secondary" onClick={() => void query.refetch()} loading={query.isFetching} disabled={!userId}>
          {!query.isFetching && <RefreshCw className="h-4 w-4" aria-hidden />}Refresh
        </Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search this page…"
              aria-label="Search transactions on this page"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
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
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">
          <p>Search and filters apply to the {data?.items.length ?? 0} transactions loaded on this page only.</p>
          {(search || activeFilterCount > 0) && <button type="button" className="font-medium text-brand-700 hover:text-brand-800" onClick={clearFilters}>Clear all filters</button>}
        </div>
        {data && (
          <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 md:hidden">
            {FILTER_COLUMNS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`transaction-mobile-filter-${key}`} className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                <select
                  id={`transaction-mobile-filter-${key}`}
                  aria-label={`${label} filter (mobile)`}
                  value={filters[key] ?? ''}
                  onChange={(event) => setFilter(key, event.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="">All values</option>
                  <option value={EMPTY_FILTER_VALUE}>No value</option>
                  {optionsFor(key).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

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
                  {FILTER_COLUMNS.map(({ key, label }) => th(key, label))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">No matching transactions. Change a filter or clear all filters to see this page's transactions.</td></tr>
                ) : rows.map((transaction) => (
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
