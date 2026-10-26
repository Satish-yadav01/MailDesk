import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, TriangleAlert, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { TextAreaField, TextField } from '@/components/ui/form';
import { Alert, Badge, PageHeader } from '@/components/ui/misc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceHealth } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { driveLinkSchema, sendMailSchema, type DriveLinkForm, type SendMailForm } from '@/lib/validators';
import { mailService } from '@/services/mail-service';

const errMsg = (e: unknown) => toApiError(e).message;

function ResumeUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const m = useMutation({
    mutationFn: (f: File) => mailService.uploadResume(f, setProgress),
    onSuccess: (r) => { toast.success(r.message ?? 'Resume uploaded'); setFile(null); if (ref.current) ref.current.value = ''; },
    onError: (e) => toast.error('Resume upload failed', { description: errMsg(e) }),
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={ref} type="file" aria-label="Resume file" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 sm:w-auto"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={m.isPending} />
        <Button onClick={() => file && !m.isPending && m.mutate(file)} disabled={!file} loading={m.isPending}><Upload className="h-4 w-4" aria-hidden />Upload resume</Button>
      </div>
      {m.isPending && <p className="text-xs text-slate-500">Uploading… {progress}%</p>}
      {m.isError && <Alert variant="error">{errMsg(m.error)}</Alert>}
      {m.isSuccess && <Alert variant="success">{m.data.message ?? 'Resume uploaded.'}</Alert>}
      <p className="text-xs text-slate-500">Accepted file types and size limits are not specified by the API; the server will reject unsupported files.</p>
    </div>
  );
}

function DriveLink() {
  const f = useForm<DriveLinkForm>({ resolver: zodResolver(driveLinkSchema), defaultValues: { driveLink: '', fileName: '' } });
  const m = useMutation({
    mutationFn: mailService.addResumeFromDrive,
    onSuccess: (r) => { toast.success(r.message ?? 'Resume added from Drive'); f.reset(); },
    onError: (e) => toast.error('Could not add resume', { description: errMsg(e) }),
  });
  return (
    <form noValidate className="space-y-4" onSubmit={f.handleSubmit((v) => !m.isPending && m.mutate(v))}>
      <TextField label="Google Drive share link" required placeholder="https://drive.google.com/file/d/FILE_ID/view" error={f.formState.errors.driveLink?.message} {...f.register('driveLink')} />
      <TextField label="File name" required placeholder="resume.pdf" error={f.formState.errors.fileName?.message} {...f.register('fileName')} />
      {m.isError && <Alert variant="error">{errMsg(m.error)}</Alert>}
      <Button type="submit" loading={m.isPending}>Add from Drive</Button>
    </form>
  );
}

function SendTest() {
  const [pending, setPending] = useState<SendMailForm | null>(null);
  const f = useForm<SendMailForm>({ resolver: zodResolver(sendMailSchema), defaultValues: { to: '', subject: '', message: '' } });
  const m = useMutation({
    mutationFn: mailService.send,
    onSuccess: (r) => { toast.success(r.message ?? 'Email sent'); f.reset(); setPending(null); },
    onError: (e) => { toast.error('Send failed', { description: errMsg(e) }); setPending(null); },
  });
  return (
    <>
      <form noValidate className="space-y-4" onSubmit={f.handleSubmit((v) => setPending(v))}>
        <TextField label="To" type="email" required placeholder="recipient@example.com" hint="Use a test address you control." error={f.formState.errors.to?.message} {...f.register('to')} />
        <TextField label="Subject" required placeholder="Example message" error={f.formState.errors.subject?.message} {...f.register('subject')} />
        <TextAreaField label="Message" required rows={5} placeholder="Hello, this is a test message." error={f.formState.errors.message?.message} {...f.register('message')} />
        {m.isError && <Alert variant="error">{errMsg(m.error)}</Alert>}
        <Button type="submit" loading={m.isPending}><Send className="h-4 w-4" aria-hidden />Send email</Button>
      </form>
      <Modal open={!!pending} onOpenChange={(o) => !o && !m.isPending && setPending(null)} title="Send this email?"
        description="This sends a real email with your configured resume attached."
        footer={<><Button variant="secondary" onClick={() => setPending(null)} disabled={m.isPending}>Cancel</Button><Button loading={m.isPending} onClick={() => pending && !m.isPending && m.mutate(pending)}>Send now</Button></>}>
        <p className="break-all text-sm text-slate-600">To: <strong>{pending?.to}</strong></p>
      </Modal>
    </>
  );
}

function ColdTrigger() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const m = useMutation({
    mutationFn: mailService.triggerColdEmail,
    onSuccess: (r) => { toast.success(r.message ?? 'Cold-email batch triggered'); setOpen(false); setTyped(''); },
    onError: (e) => toast.error('Trigger failed', { description: errMsg(e) }),
  });
  return (
    <>
      <Alert variant="warning" title="This sends real emails">Triggers the cold-email batch immediately and may contact the configured recipients.</Alert>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}><TriangleAlert className="h-4 w-4" aria-hidden />Trigger cold-email batch</Button>
      <Modal open={open} onOpenChange={(o) => { if (!m.isPending) { setOpen(o); if (!o) setTyped(''); } }} title="Trigger the cold-email batch?"
        description="Real emails may be sent right now. This cannot be undone."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)} disabled={m.isPending}>Cancel</Button>
          <Button variant="danger" disabled={typed !== 'SEND'} loading={m.isPending} onClick={() => !m.isPending && m.mutate()}>Trigger now</Button></>}>
        <TextField label="Type SEND to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Modal>
    </>
  );
}

export function MailSenderPage() {
  const health = useServiceHealth();
  return (
    <>
      <PageHeader title="Mail Sender" description="Configure the resume attachment and send messages through the Mail Service."
        actions={health.isPending ? <Badge>Checking service…</Badge> : health.isError ? <Badge tone="rose">Service unreachable</Badge> : <Badge tone={health.data.ok ? 'green' : 'amber'}>{health.data.ok ? 'Service healthy' : 'Service degraded'}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Resume — upload a file</CardTitle><CardDescription>Attached to outgoing emails.</CardDescription></CardHeader><CardContent><ResumeUpload /></CardContent></Card>
        <Card><CardHeader><CardTitle>Resume — Google Drive link</CardTitle><CardDescription>The file must be accessible via the link.</CardDescription></CardHeader><CardContent><DriveLink /></CardContent></Card>
        <Card><CardHeader><CardTitle>Send a test email</CardTitle><CardDescription>Sends to one recipient with the resume attached.</CardDescription></CardHeader><CardContent><SendTest /></CardContent></Card>
        <Card className="border-rose-200"><CardHeader><CardTitle>Danger zone</CardTitle><CardDescription>Batch sending</CardDescription></CardHeader><CardContent><ColdTrigger /></CardContent></Card>
      </div>
    </>
  );
}
