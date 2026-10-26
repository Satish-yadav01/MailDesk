import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';

export function Modal({ open, onOpenChange, title, description, children, footer }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
          <D.Title className="text-lg font-semibold text-slate-900">{title}</D.Title>
          <D.Description className="mt-1 text-sm text-slate-500">{description ?? 'Dialog'}</D.Description>
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          <D.Close asChild><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Close"><X className="h-4 w-4" /></Button></D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
