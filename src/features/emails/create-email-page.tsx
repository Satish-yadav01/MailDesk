import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, PageHeader } from '@/components/ui/misc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddEmails } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { emailRecordSchema, emptyEmailRecord, type EmailRecordForm } from '@/lib/validators';
import { RecordFields, toPayload } from './record-fields';
import { TransactionPanel } from './transaction-panel';

export function CreateEmailPage() {
  const mutation = useAddEmails();
  const [tid, setTid] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const f = useForm<EmailRecordForm>({ resolver: zodResolver(emailRecordSchema), defaultValues: emptyEmailRecord() });

  const onSubmit = f.handleSubmit((v) => {
    if (mutation.isPending) return;
    setFormError(null); setServerErrors({});
    // The API only exposes an array endpoint, so a single record is sent as a one-element array.
    mutation.mutate([toPayload({ ...v, emailStatus: 'UNVERIFIED' })], {
      onSuccess: (res) => { setTid(res.tid); f.reset(emptyEmailRecord()); toast.success('Accepted for processing', { description: `Transaction ${res.tid}` }); },
      onError: (e) => {
        const err = toApiError(e);
        setServerErrors(err.fieldErrors); setFormError(err.message);
        toast.error('Could not create the record', { description: err.message });
      },
    });
  });

  return (
    <>
      <PageHeader title="Create Single Email" description="Add one record to the Mail Service. Processing happens asynchronously on the server." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Record details</CardTitle><CardDescription>Only the email address is required here.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} noValidate className="space-y-6" aria-label="Create email record">
                {formError && <Alert variant="error" title="Request failed">{formError}</Alert>}
                <RecordFields register={f.register} errors={f.formState.errors} serverErrors={serverErrors} showEmailStatus={false} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => f.reset(emptyEmailRecord())} disabled={mutation.isPending}>Clear</Button>
                  <Button type="submit" loading={mutation.isPending}>Create record</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          {tid && <TransactionPanel tid={tid} title="Submission status" />}
        </div>
        <aside className="space-y-4">
          <Alert variant="info" title="What this does">Submits the record to <code className="text-xs">POST /api/emails/add</code>. It stores a record; it does not send an email message.</Alert>
          <p className="text-sm text-slate-500">Have many records? Use <Link className="font-medium text-brand-600" to="/app/emails/bulk">Create Multiple</Link> or <Link className="font-medium text-brand-600" to="/app/import">Excel import</Link>.</p>
        </aside>
      </div>
    </>
  );
}
