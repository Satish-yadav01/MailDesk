import { useRef, useState, type DragEvent } from 'react';
import { FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, PageHeader, Skeleton } from '@/components/ui/misc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmailHeaders, useImportExcel } from '@/hooks/use-email-queries';
import { toApiError } from '@/lib/api-errors';
import { validateExcelFile } from '@/lib/validators';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/utils/format';
import { TransactionPanel } from '@/features/emails/transaction-panel';

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tid, setTid] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mutation = useImportExcel();
  const headers = useEmailHeaders();

  const choose = (f: File | undefined | null) => {
    setUploadError(null);
    if (!f) return;
    const err = validateExcelFile(f);
    setFileError(err);
    setFile(err ? null : f);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); if (!mutation.isPending) choose(e.dataTransfer.files?.[0]); };
  const clear = () => { setFile(null); setFileError(null); if (inputRef.current) inputRef.current.value = ''; };

  const upload = () => {
    if (!file || mutation.isPending) return;
    setProgress(0); setUploadError(null);
    mutation.mutate({ file, onProgress: setProgress }, {
      onSuccess: (res) => { setTid(res.tid); clear(); toast.success('File accepted for processing', { description: `Transaction ${res.tid}` }); },
      onError: (e) => { const err = toApiError(e); setUploadError(err.message); toast.error('Upload failed', { description: err.message }); },
    });
  };

  return (
    <>
      <PageHeader title="Upload Excel File" description="Import many email records from a spreadsheet. The server processes the file asynchronously." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Choose a file</CardTitle><CardDescription>.xlsx or .xls, sent as multipart/form-data in the field “file”.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                className={cn('flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors', dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50')}>
                <UploadCloud className="h-9 w-9 text-brand-500" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-900">Drag and drop your spreadsheet here</p>
                <p className="mt-1 text-xs text-slate-500">or</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => inputRef.current?.click()} disabled={mutation.isPending}>Browse files</Button>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="sr-only" aria-label="Excel file" tabIndex={-1} onChange={(e) => choose(e.target.files?.[0])} />
              </div>

              {fileError && <Alert variant="error">{fileError}</Alert>}
              {uploadError && <Alert variant="error" title="Upload failed">{uploadError}</Alert>}

              {file && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><FileSpreadsheet className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{formatBytes(file.size)}</p></div>
                  <Button variant="ghost" size="icon" aria-label="Remove file" onClick={clear} disabled={mutation.isPending}><X className="h-4 w-4" /></Button>
                </div>
              )}

              {mutation.isPending && (
                <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{progress < 100 ? 'Uploading…' : 'Waiting for server…'}</span><span>{progress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              )}

              <div className="flex justify-end"><Button onClick={upload} disabled={!file} loading={mutation.isPending}>Upload and import</Button></div>
            </CardContent>
          </Card>
          {tid && <TransactionPanel tid={tid} title="Import status" />}
        </div>

        <aside className="space-y-4">
          <Card><CardHeader><CardTitle>Expected columns</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-slate-500">The server’s configured headers:</p>
              {headers.isPending ? <Skeleton className="h-16 w-full" />
                : headers.isError ? <Alert variant="warning">Couldn’t load the header list. {toApiError(headers.error).message}</Alert>
                : headers.data.length === 0 ? <p className="text-slate-500">The server returned no headers.</p>
                : <ul className="flex flex-wrap gap-1.5">{headers.data.map((h) => <li key={h} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{h}</li>)}</ul>}
              <p className="text-xs text-slate-500">Which columns are mandatory and the maximum file size are not specified by the API; the server will report any rejected rows in the status panel.</p>
            </CardContent></Card>
        </aside>
      </div>
    </>
  );
}
