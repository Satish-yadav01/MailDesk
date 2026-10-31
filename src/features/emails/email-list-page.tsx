import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Filter, Inbox, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/misc';
import { useEmailList } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { display, formatDate } from '@/utils/format';
import type { EmailRecord } from '@/types/api';
import { buildEmailCsv } from './email-export';

type SortKey = 'email' | 'name' | 'emailStatus' | 'companyName' | 'createdAt';
type FilterKey = SortKey | 'jobTitle' | 'location';
type Filters = Partial<Record<FilterKey, string>>;
const PAGE_SIZES = [10, 25, 50, 100];
const EMPTY_FILTER_VALUE = '__empty__';
const FILTER_POPUP_HEIGHT = 156;
const FILTER_POPUP_WIDTH = 224;

const fullName = (r: EmailRecord) => [r.firstName, r.lastName].filter(Boolean).join(' ');
const filterValue = (record: EmailRecord, key: FilterKey) => {
  if (key === 'name') return fullName(record);
  if (key === 'createdAt') return record.createdAt?.slice(0, 10) ?? '';
  return record[key] ?? '';
};
const filterOptionLabel = (key: FilterKey, value: string) => key === 'createdAt'
  ? new Date(`${value}T00:00:00`).toLocaleDateString()
  : value;
const FILTER_COLUMNS: { key: FilterKey; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'name', label: 'Name' },
  { key: 'emailStatus', label: 'Status' },
  { key: 'companyName', label: 'Company' },
  { key: 'jobTitle', label: 'Title' },
  { key: 'location', label: 'Location' },
  { key: 'createdAt', label: 'Created' },
];
const statusTone = (s: string | null) => (!s ? 'slate' : /^(verified|valid|active)$/i.test(s) ? 'green' : /^(invalid|bounced|failed)$/i.test(s) ? 'rose' : /unverified|pending/i.test(s) ? 'amber' : 'slate') as 'slate' | 'green' | 'rose' | 'amber';

export function EmailListPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);
  const filterButtonRefs = useRef<Partial<Record<FilterKey, HTMLButtonElement>>>({});
  const [filterPopupPosition, setFilterPopupPosition] = useState({ top: 0, left: 0 });
  const q = useEmailList(page, size);
  const data = q.data;

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

  const rows = useMemo(() => {
    let items = data?.items ?? [];
    const term = search.trim().toLowerCase();
    if (term) items = items.filter((r) => [r.email, fullName(r), r.companyName, r.jobTitle, r.location, r.emailStatus].some((v) => v?.toLowerCase().includes(term)));
    items = items.filter((record) => FILTER_COLUMNS.every(({ key }) => {
      const value = filters[key];
      if (!value) return true;
      const currentValue = filterValue(record, key);
      return value === EMPTY_FILTER_VALUE ? !currentValue : currentValue === value;
    }));
    if (sort) {
      const val = (r: EmailRecord) => (sort.key === 'name' ? fullName(r) : (r[sort.key] ?? '')).toLowerCase();
      items = [...items].sort((a, b) => val(a).localeCompare(val(b)) * (sort.dir === 'asc' ? 1 : -1));
    }
    return items;
  }, [data, search, filters, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));
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
  const exportRows = () => {
    const blob = new Blob([buildEmailCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maildesk-email-list.csv';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const optionsFor = (key: FilterKey) => [...new Set((data?.items ?? []).map((record) => filterValue(record, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const hasNext = data ? (data.totalPages !== null ? page + 1 < data.totalPages : data.items.length === size) : false;

  const th = (key: FilterKey, label: string, sortKey?: SortKey) => {
    const options = optionsFor(key);
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
        <label htmlFor={`filter-${key}`} className="mb-1.5 block text-xs font-medium text-slate-600">Filter {label.toLowerCase()}</label>
        <select
          id={`filter-${key}`}
          aria-label={`${label} filter`}
          value={selected}
          onChange={(event) => setFilter(key, event.target.value)}
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-500"
        >
          <option value="">All values</option>
          <option value={EMPTY_FILTER_VALUE}>No value</option>
          {options.map((option) => (
            <option key={option} value={option}>{filterOptionLabel(key, option)}</option>
          ))}
        </select>
        <button type="button" className="mt-2 text-xs font-medium text-brand-700 hover:text-brand-800" onClick={() => setFilter(key, '')}>Clear this filter</button>
      </div>,
      document.body,
    ) : null;
    return (
      <th scope="col" aria-sort={sortKey && sort?.key === sortKey ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="relative px-4 py-3 text-left font-medium">
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
          {sortKey ? (
            <button className="inline-flex items-center gap-1 font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort(sortKey)}>
              {label}{sort?.key === sortKey && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
          ) : <span className="font-medium uppercase tracking-wide">{label}</span>}
        </div>
        {popup}
      </th>
    );
  };

  return (
    <>
      <PageHeader title="Email List" description="Records stored by the Mail Service. This view is read-only — the API has no edit or delete operations."
        actions={<>
          <Button variant="secondary" onClick={() => void q.refetch()} loading={q.isFetching}>{!q.isFetching && <RefreshCw className="h-4 w-4" aria-hidden />}Refresh</Button>
          <Button variant="secondary" onClick={exportRows} disabled={rows.length === 0} title="Export the filtered records currently loaded on this page">
            <Download className="h-4 w-4" aria-hidden />Export Excel
          </Button>
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
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">
          <p>Search, filters, and sorting apply to the {data?.items.length ?? 0} records loaded on this page only.</p>
          {(search || activeFilterCount > 0) && <button type="button" className="font-medium text-brand-700 hover:text-brand-800" onClick={clearFilters}>Clear all filters</button>}
        </div>
        {data && (
          <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 md:hidden">
            {FILTER_COLUMNS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`mobile-filter-${key}`} className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                <select
                  id={`mobile-filter-${key}`}
                  aria-label={`${label} filter (mobile)`}
                  value={filters[key] ?? ''}
                  onChange={(event) => setFilter(key, event.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="">All values</option>
                  <option value={EMPTY_FILTER_VALUE}>No value</option>
                  {optionsFor(key).map((option) => <option key={option} value={option}>{filterOptionLabel(key, option)}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {q.isPending ? (
          <div className="space-y-3 p-4" aria-label="Loading records" role="status">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.isError ? (
          <ErrorState message={toApiError(q.error).message} onRetry={() => void q.refetch()} />
        ) : data?.items.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title="No email records yet"
            description="Create a record or import a spreadsheet to get started."
            action={<Button asChild><Link to="/app/emails/new">Create email</Link></Button>} />
        ) : (
          <>
            <div className={cn('hidden overflow-x-auto md:block', q.isFetching && 'opacity-60')}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                  {th('email', 'Email', 'email')}{th('name', 'Name', 'name')}{th('emailStatus', 'Status', 'emailStatus')}{th('companyName', 'Company', 'companyName')}
                  {th('jobTitle', 'Title')}{th('location', 'Location')}{th('createdAt', 'Created', 'createdAt')}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No matching records. Change a filter or clear all filters to see this page's records.</td></tr>
                  ) : rows.map((r) => (
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
              {rows.length === 0 ? (
                <li className="p-6 text-center text-sm text-slate-500">No matching records. Change a filter or clear all filters to see this page's records.</li>
              ) : rows.map((r) => (
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
