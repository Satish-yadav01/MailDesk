import { useState } from 'react';
import { Send, TriangleAlert, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { Alert, PageHeader } from '@/components/ui/misc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MailAction = 'upload' | 'drive' | 'send' | 'batch';

const ACTION_LABELS: Record<MailAction, string> = {
  upload: 'Upload resume',
  drive: 'Add from Drive',
  send: 'Send email',
  batch: 'Trigger cold-email batch',
};

export function MailSenderPage() {
  const [selectedAction, setSelectedAction] = useState<MailAction | null>(null);

  return (
    <>
      <PageHeader title="Mail Sender" description="Configure the resume attachment and send messages through the Mail Service." />
      <Alert variant="info" title="Mail Sender is under construction">
        These features are temporarily unavailable while backend work is in progress. Selecting an action will show this notice; no request will be sent.
      </Alert>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Resume — upload a file</CardTitle><CardDescription>Attach a resume to outgoing emails.</CardDescription></CardHeader>
          <CardContent>
            <Button onClick={() => setSelectedAction('upload')}><Upload className="h-4 w-4" aria-hidden />Upload resume</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resume — Google Drive link</CardTitle><CardDescription>Add a resume using a shareable Drive link.</CardDescription></CardHeader>
          <CardContent><Button variant="secondary" onClick={() => setSelectedAction('drive')}>Add from Drive</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Send a test email</CardTitle><CardDescription>Send a message to one recipient with the resume attached.</CardDescription></CardHeader>
          <CardContent><Button onClick={() => setSelectedAction('send')}><Send className="h-4 w-4" aria-hidden />Send email</Button></CardContent>
        </Card>
        <Card className="border-rose-200">
          <CardHeader><CardTitle>Danger zone</CardTitle><CardDescription>Batch sending</CardDescription></CardHeader>
          <CardContent>
            <Alert variant="warning" title="Temporarily unavailable">Batch sending is disabled while Mail Sender is under construction.</Alert>
            <Button variant="danger" className="mt-4" onClick={() => setSelectedAction('batch')}>
              <TriangleAlert className="h-4 w-4" aria-hidden />Trigger cold-email batch
            </Button>
          </CardContent>
        </Card>
      </div>
      <Modal
        open={selectedAction !== null}
        onOpenChange={(open) => { if (!open) setSelectedAction(null); }}
        title="Under construction"
        description={selectedAction ? `${ACTION_LABELS[selectedAction]} is not available yet.` : undefined}
        footer={<Button onClick={() => setSelectedAction(null)}>Got it</Button>}
      >
        <p className="text-sm text-slate-600">We’re working on the Mail Sender backend. Please try again later. No request was sent.</p>
      </Modal>
    </>
  );
}
