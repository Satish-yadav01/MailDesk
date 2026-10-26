import type { AsyncSubmission, EmailPage, EmailRecord, ServiceHealth, SimpleResult, TransactionStatus } from '@/types/api';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : typeof v === 'object' ? null : String(v));
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

const KNOWN = ['id', 'firstName', 'lastName', 'email', 'emailStatus', 'jobTitle', 'companyName', 'companyDomain', 'location',
  'createdAt', 'createdDate', 'createdOn', 'created_at', 'createdDateTime'];

export function normalizeRecord(raw: unknown, index: number): EmailRecord {
  const r = isRecord(raw) ? raw : {};
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!KNOWN.includes(k)) extra[k] = v;
  const id = str(r.id);
  const email = str(r.email);
  return {
    key: id ?? `${email ?? 'row'}-${index}`,
    id,
    firstName: str(r.firstName), lastName: str(r.lastName), email, emailStatus: str(r.emailStatus),
    jobTitle: str(r.jobTitle), companyName: str(r.companyName), companyDomain: str(r.companyDomain), location: str(r.location),
    createdAt: str(r.createdAt ?? r.createdDate ?? r.createdOn ?? r.created_at ?? r.createdDateTime),
    extra,
  };
}

/** Accepts a bare array or a Spring-style / wrapped page. The exact contract is unconfirmed, so be lenient. */
export function normalizeEmailPage(data: unknown, requestedPage: number, requestedSize: number): EmailPage {
  let list: unknown[] = [];
  let container: Record<string, unknown> = {};
  if (Array.isArray(data)) list = data;
  else if (isRecord(data)) {
    container = data;
    const inner = ['content', 'data', 'items', 'records', 'emails', 'results'].map((k) => data[k]).find(Array.isArray);
    if (Array.isArray(inner)) list = inner;
    else if (isRecord(data.data)) {
      container = { ...data, ...data.data };
      const nested = ['content', 'items', 'records', 'emails', 'results'].map((k) => (data.data as Record<string, unknown>)[k]).find(Array.isArray);
      if (Array.isArray(nested)) list = nested;
    }
  }
  const items = list.map(normalizeRecord);
  const pageObj = isRecord(container.page) ? container.page : {};
  const totalElements = num(container.totalElements ?? container.total ?? container.totalCount ?? pageObj.totalElements);
  const totalPages = num(container.totalPages ?? pageObj.totalPages) ?? (totalElements !== null ? Math.ceil(totalElements / requestedSize) : null);
  return {
    items,
    page: num(container.number ?? container.pageNumber ?? pageObj.number) ?? requestedPage,
    size: num(container.size ?? container.pageSize ?? pageObj.size) ?? requestedSize,
    totalElements,
    totalPages,
  };
}

export function normalizeHeaders(data: unknown): string[] {
  const pick = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : isRecord(x) ? str(x.name ?? x.header ?? x.label ?? x.key) : null)).filter((x): x is string => !!x) : [];
  if (Array.isArray(data)) return pick(data);
  if (isRecord(data)) {
    for (const k of ['headers', 'data', 'columns', 'emailListHeaders']) {
      const got = pick(data[k]);
      if (got.length) return got;
    }
    const keys = Object.keys(data);
    if (keys.length && keys.every((k) => typeof data[k] === 'string')) return Object.values(data) as string[];
  }
  return [];
}

export function normalizeSubmission(data: unknown): AsyncSubmission {
  const tid = isRecord(data) ? str(data.tid ?? data.TID ?? data.transactionId) : typeof data === 'string' || typeof data === 'number' ? String(data) : null;
  if (!tid) throw new Error('The server accepted the request but did not return a transaction ID (tid).');
  return { tid, raw: data };
}

const SUCCESS = ['COMPLETED', 'COMPLETE', 'SUCCESS', 'SUCCEEDED', 'DONE', 'FINISHED', 'PROCESSED'];
const FAILURE = ['FAILED', 'FAILURE', 'ERROR', 'REJECTED', 'CANCELLED', 'CANCELED', 'PARTIAL_FAILURE'];

/** Status vocabulary is unconfirmed; unknown statuses are treated as non-terminal (polling is capped by the caller). */
export function normalizeTransaction(data: unknown, tid: string): TransactionStatus {
  const r = isRecord(data) ? data : {};
  const status = str(r.txnStatus ?? r.status ?? r.state ?? r.transactionStatus);
  const statusCode = num(r.statusCode);
  const message = str(r.statusMsg ?? r.message ?? r.statusMessage ?? r.description);
  const s = (status ?? '').toUpperCase();
  const isFailure = FAILURE.includes(s) || (statusCode !== null && statusCode >= 400);
  const isTerminal = isFailure || SUCCESS.includes(s) || statusCode === 200;
  return { tid, status, statusCode, message, isTerminal, isFailure, raw: data };
}

export function normalizeHealth(data: unknown): ServiceHealth {
  if (typeof data === 'string') return { ok: true, message: data.slice(0, 200) };
  if (isRecord(data)) {
    const s = str(data.status ?? data.state)?.toUpperCase();
    return { ok: s ? ['UP', 'OK', 'HEALTHY', 'RUNNING'].includes(s) : true, message: str(data.message ?? data.status) };
  }
  return { ok: true, message: null };
}

export function normalizeSimple(data: unknown): SimpleResult {
  if (typeof data === 'string') return { message: data.slice(0, 500) || null, raw: data };
  if (isRecord(data)) return { message: str(data.message ?? data.status ?? data.result), raw: data };
  return { message: null, raw: data };
}
