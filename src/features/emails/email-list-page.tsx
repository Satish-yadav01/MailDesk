import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/misc';
import { useEmailList } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { display, formatDate } from '@/utils/format';
import type { EmailRecord } from '@/types/api';

type SortKey = 'email' | 'name' | 'emailStatus' | 'companyName' | 'createdAt';
const PAGE_SIZES = [10, 25, 50, 100];

const fullName = (r: EmailRecord) => [r.firstName, r.lastName].filter(Boolean).join(' ');
const statusTone = (s: string | null) => (!s ? 'slate' : /^(verified|valid|active)$/i.test(s) ? 'green' : /^(invalid|bounced|failed)$/i.test(s) ? 'rose' : /unverified|pending/i.test(s) ? 'amber' : 'slate') as 'slate' | 'green' | 'rose' | 'amber';

export function EmailListPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const q = useEmailList(page, size);
  const data = q.data;

  const rows = useMemo(() => {
    let items = data?.items ?? [];
    const term = search.trim().toLowerCase();
    if (term) items = items.filter((r) => [r.email, fullName(r), r.companyName, r.jobTitle, r.location, r.emailStatus].some((v) => v?.toLowerCase().includes(term)));
    if (sort) {
      const val = (r: EmailRecord) => (sort.key === 'name' ? fullName(r) : (r[sort.key] ?? '')).toLowerCase();
      items = [...items].sort((a, b) => val(a).localeCompare(val(b)) * (sort.dir === 'asc' ? 1 : -1));
    }
    return items;
  }, [data, search, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));
  const hasNext = data ? (data.totalPages !== null ? page + 1 < data.totalPages : data.items.length === size) : false;

  const th = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-left font-medium">
      <button className="inline-flex items-center gap-1 font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort(key)}>
        {label}{sort?.key === key && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <>
      <PageHeader title="Email List" description="Records stored by the Mail Service. This view is read-only — the API has no edit or delete operations."
        actions={<>
          <Button variant="secondary" onClick={() => void q.refetch()} loading={q.isFetching}>{!q.isFetching && <RefreshCw className="h-4 w-4" aria-hidden />}Refresh</Button>
          <Button asChild><Link to="/app/emails/new"><Plus className="h-4 w-4" aria-hidden />New email</Link></Button>
        </>} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this page…" aria-label="Search records on this page"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500" />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <label htmlFor="page-size">Rows</label>
            <select id="page-size" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">Search and sorting apply to the {data?.items.length ?? 0} records loaded on this page only.</p>

        {q.isPending ? (
          <div className="space-y-3 p-4" aria-label="Loading records" role="status">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.isError ? (
          <ErrorState message={toApiError(q.error).message} onRetry={() => void q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title={search ? 'No matching records' : 'No email records yet'}
            description={search ? 'Try a different search term, or clear the search.' : 'Create a record or import a spreadsheet to get started.'}
            action={search ? <Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button> : <Button asChild><Link to="/app/emails/new">Create email</Link></Button>} />
        ) : (
          <>
            <div className={cn('hidden overflow-x-auto md:block', q.isFetching && 'opacity-60')}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                  {th('email', 'Email')}{th('name', 'Name')}{th('emailStatus', 'Status')}{th('companyName', 'Company')}
                  <th scope="col" className="px-4 py-3 text-left font-medium">Title</th><th scope="col" className="px-4 py-3 text-left font-medium">Location</th>{th('createdAt', 'Created')}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{display(r.email)}</td>
                      <td className="px-4 py-3">{display(fullName(r) || null)}</td>
                      <td className="px-4 py-3"><Badge tone={statusTone(r.emailStatus)}>{display(r.emailStatus)}</Badge></td>
                      <td className="px-4 py-3">{display(r.companyName)}</td>
                      <td className="px-4 py-3">{display(r.jobTitle)}</td>
                      <td className="px-4 py-3">{display(r.location)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={cn('divide-y divide-slate-100 md:hidden', q.isFetching && 'opacity-60')}>
              {rows.map((r) => (
                <li key={r.key} className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-2"><p className="break-all font-medium text-slate-900">{display(r.email)}</p><Badge tone={statusTone(r.emailStatus)}>{display(r.emailStatus)}</Badge></div>
                  <p className="text-sm text-slate-600">{display(fullName(r) || null)}</p>
                  <p className="text-xs text-slate-500">{[r.jobTitle, r.companyName, r.location].filter(Boolean).join(' · ') || '—'}</p>
                  {r.createdAt && <p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p>}
                </li>
              ))}
            </ul>
          </>
        )}

        {data && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>Page {page + 1}{data.totalPages !== null ? ` of ${Math.max(data.totalPages, 1)}` : ''}{data.totalElements !== null ? ` · ${data.totalElements} total` : ''}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0 || q.isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}><ChevronLeft className="h-4 w-4" aria-hidden />Prev</Button>
              <Button variant="secondary" size="sm" disabled={!hasNext || q.isFetching} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
