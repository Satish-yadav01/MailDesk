import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, Badge, PageHeader } from '@/components/ui/misc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddEmails } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { bulkSchema, emailRecordSchema, emptyEmailRecord, type BulkForm } from '@/lib/validators';
import { RecordFields, toPayload } from './record-fields';
import { TransactionPanel } from './transaction-panel';

export function BulkEmailPage() {
  const mutation = useAddEmails();
  const [tid, setTid] = useState<string | null>(null);
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [formError, setFormError] = useState<string | null>(null);
  const f = useForm<BulkForm>({ resolver: zodResolver(bulkSchema), defaultValues: { rows: [emptyEmailRecord()] }, mode: 'onTouched' });
  const { fields, append, remove } = useFieldArray({ control: f.control, name: 'rows' });
  const rows = useWatch({ control: f.control, name: 'rows' });

  // Per-row validity, and duplicate-email detection within the batch.
  const status = useMemo(() => {
    const seen = new Map<string, number>();
    return (rows ?? []).map((r) => {
      const ok = emailRecordSchema.safeParse(r).success;
      const key = (r?.email ?? '').trim().toLowerCase();
      const dup = !!key && seen.has(key);
      if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
      return { valid: ok, duplicate: dup };
    });
  }, [rows]);
  const validCount = status.filter((s) => s.valid).length;
  const invalidCount = status.length - validCount;
  const dupCount = status.filter((s) => s.duplicate).length;

  const goReview = f.handleSubmit(() => setStep('review'));

  const submit = () => {
    if (mutation.isPending) return;
    setFormError(null);
    const payload = f.getValues('rows').map((row) => toPayload({ ...row, emailStatus: 'UNVERIFIED' }));
    mutation.mutate(payload, {
      onSuccess: (res) => {
        setTid(res.tid); setStep('edit'); f.reset({ rows: [emptyEmailRecord()] });
        toast.success(`${payload.length} record${payload.length === 1 ? '' : 's'} accepted`, { description: `Transaction ${res.tid}` });
      },
      onError: (e) => { const err = toApiError(e); setFormError(err.message); toast.error('Submission failed', { description: err.message }); },
    });
  };

  return (
    <>
      <PageHeader title="Create Multiple Emails" description="Add several records at once, review them, then submit them in a single request." />
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Badge tone="slate">{fields.length} total</Badge>
            <Badge tone="green">{validCount} valid</Badge>
            <Badge tone={invalidCount ? 'rose' : 'slate'}>{invalidCount} invalid</Badge>
            {dupCount > 0 && <Badge tone="amber">{dupCount} duplicate email{dupCount > 1 ? 's' : ''} in batch</Badge>}
          </CardContent>
        </Card>

        {formError && <Alert variant="error" title="Submission failed">{formError}</Alert>}

        {step === 'edit' ? (
          <form onSubmit={goReview} noValidate aria-label="Bulk email records" className="space-y-4">
            {fields.map((field, i) => (
              <Card key={field.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Record {i + 1}</CardTitle>
                    {status[i] && (status[i].valid ? <Badge tone="green">Valid</Badge> : <Badge tone="rose">Needs attention</Badge>)}
                    {status[i]?.duplicate && <Badge tone="amber">Duplicate</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove record ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent>
                  <RecordFields idPrefix={`row${i}-`} register={(n) => f.register(`rows.${i}.${n}` as const)} errors={f.formState.errors.rows?.[i]} showEmailStatus={false} />
                </CardContent>
              </Card>
            ))}
            {f.formState.errors.rows?.root?.message && <Alert variant="error">{f.formState.errors.rows.root.message}</Alert>}
            {f.formState.errors.rows?.message && <Alert variant="error">{f.formState.errors.rows.message}</Alert>}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="secondary" onClick={() => append(emptyEmailRecord())} disabled={fields.length >= 500}><Plus className="h-4 w-4" aria-hidden />Add another row</Button>
              <Button type="submit">Review {fields.length} record{fields.length === 1 ? '' : 's'}</Button>
            </div>
          </form>
        ) : (
          <Card>
            <CardHeader><CardTitle>Review before submitting</CardTitle><CardDescription>All {fields.length} records passed validation. Nothing is sent until you confirm.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {dupCount > 0 && <Alert variant="warning">Some emails appear more than once in this batch. The server decides how duplicates are handled.</Alert>}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                    {['#', 'Email', 'Name', 'Company', 'Status'].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {(rows ?? []).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{r.email}</td>
                        <td className="px-3 py-2">{[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}</td>
                        <td className="px-3 py-2">{r.companyName || '—'}</td>
                        <td className="px-3 py-2">UNVERIFIED</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="secondary" onClick={() => setStep('edit')} disabled={mutation.isPending}><ArrowLeft className="h-4 w-4" aria-hidden />Back to edit</Button>
                <Button onClick={submit} loading={mutation.isPending}>Submit {fields.length} record{fields.length === 1 ? '' : 's'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tid && (
          <>
            <Alert variant="info" title="Per-record results">The API returns one transaction ID for the whole batch. Any per-record detail the server provides appears in the full response below.</Alert>
            <TransactionPanel tid={tid} title="Batch status" />
          </>
        )}
      </div>
    </>
  );
}
