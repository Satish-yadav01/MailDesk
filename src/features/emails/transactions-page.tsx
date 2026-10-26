import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, EmptyState } from '@/components/ui/misc';
import { Card, CardContent } from '@/components/ui/card';
import { TextField } from '@/components/ui/form';
import { TransactionPanel } from './transaction-panel';

export function TransactionsPage() {
  const [input, setInput] = useState('');
  const [tid, setTid] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Transaction Status" description="Look up the processing status of an add or import request by its transaction ID (TID)." />
      <div className="space-y-6">
        <Card><CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); const t = input.trim(); if (t) setTid(t); }}>
            <TextField className="flex-1" label="Transaction ID" placeholder="e.g. 1" value={input} onChange={(e) => setInput(e.target.value)} hint="Returned when you submit records or import a file." />
            <Button type="submit" disabled={!input.trim()}><Search className="h-4 w-4" aria-hidden />Check status</Button>
          </form>
        </CardContent></Card>
        {tid ? <TransactionPanel key={tid} tid={tid} /> : <Card><EmptyState icon={<Search className="h-6 w-6" />} title="No transaction selected" description="Enter a TID above to see its status." /></Card>}
      </div>
    </>
  );
}
