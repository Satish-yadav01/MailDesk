import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Badge, Alert } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { keys, useTransaction } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';

/** Renders the server-reported state of an async transaction. API-provided values are shown as text only. */
export function TransactionPanel({ tid, title = 'Processing status' }: { tid: string; title?: string }) {
  const q = useTransaction(tid);
  const qc = useQueryClient();
  const tx = q.data;

  // Newly processed records only appear in the list once the server finishes.
  useEffect(() => {
    if (tx?.isTerminal) void qc.invalidateQueries({ queryKey: keys.listAll });
  }, [tx?.isTerminal, qc]);

  const timedOut = q.timedOut;
  const tone = tx?.isFailure ? 'rose' : tx?.isTerminal ? 'green' : 'brand';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => void q.refetch()} loading={q.isFetching && !!tx}>
          {!q.isFetching && <RefreshCw className="h-3.5 w-3.5" aria-hidden />}Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Transaction ID</dt><dd className="mt-0.5 break-all font-mono text-slate-900">{tid}</dd></div>
          <div><dt className="text-xs text-slate-500">Status</dt>
            <dd className="mt-0.5">
              {q.isPending ? <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</span>
                : <span className="inline-flex items-center gap-2"><Badge tone={tone}>{tx?.status ?? 'Unknown'}</Badge>{tx?.statusCode !== null && tx?.statusCode !== undefined && <span className="text-xs text-slate-500">Code {tx.statusCode}</span>}</span>}
            </dd></div>
          <div><dt className="text-xs text-slate-500">Message</dt><dd className="mt-0.5 break-words text-slate-700">{tx?.message ?? '—'}</dd></div>
        </dl>

        {q.isError && <Alert variant="error" title="Could not check status">{toApiError(q.error).message}</Alert>}
        {tx?.isTerminal && !tx.isFailure && <Alert variant="success" title="Processing finished" className="[&_svg]:text-emerald-600"><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />The server reports this transaction as complete.</span></Alert>}
        {tx?.isFailure && <Alert variant="error" title="Processing reported a failure"><span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" />See the server response below for details.</span></Alert>}
        {tx && !tx.isTerminal && !timedOut && <p className="text-xs text-slate-500">Checking every 2 seconds until the server reports a final status…</p>}
        {timedOut && <Alert variant="warning" title="Still processing">Automatic checking stopped after about 2 minutes. Use Refresh to check again.</Alert>}

        {tx && (
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-slate-700">Full server response</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-slate-700">{safeJson(tx.raw)}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function safeJson(v: unknown): string {
  try { return typeof v === 'string' ? v : JSON.stringify(v, null, 2); } catch { return String(v); }
}
