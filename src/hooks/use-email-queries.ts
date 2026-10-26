import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailService } from '@/services/email-service';
import { mailService } from '@/services/mail-service';
import type { EmailRecordInput } from '@/types/api';

export const keys = {
  list: (page: number, size: number) => ['emails', 'list', page, size] as const,
  listAll: ['emails', 'list'] as const,
  headers: ['emails', 'headers'] as const,
  tx: (tid: string) => ['emails', 'tx', tid] as const,
  health: ['mail', 'health'] as const,
};

export const useEmailList = (page: number, size: number) =>
  useQuery({ queryKey: keys.list(page, size), queryFn: ({ signal }) => emailService.list(page, size, signal), placeholderData: (prev) => prev });

export const useEmailHeaders = () =>
  useQuery({ queryKey: keys.headers, queryFn: ({ signal }) => emailService.getHeaders(signal), staleTime: 10 * 60_000 });

export const useServiceHealth = () =>
  useQuery({ queryKey: keys.health, queryFn: ({ signal }) => mailService.health(signal), refetchInterval: 60_000, retry: false });

export const MAX_POLLS = 60;
const POLL_MS = 2000;

/** Polls the enquiry endpoint every 2s until a terminal status (or MAX_POLLS). */
export function useTransaction(tid: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.tx(tid ?? ''),
    enabled: !!tid,
    queryFn: ({ signal }) => emailService.getTransaction(tid!, signal),
    refetchInterval: (q) => (q.state.data?.isTerminal || q.state.dataUpdateCount >= MAX_POLLS ? false : POLL_MS),
  });
  const polls = qc.getQueryState(keys.tx(tid ?? ''))?.dataUpdateCount ?? 0;
  return { ...query, timedOut: !!query.data && !query.data.isTerminal && polls >= MAX_POLLS };
}

export function useAddEmails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: EmailRecordInput[]) => emailService.addEmails(records),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.listAll }); },
  });
}

export function useImportExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress, signal }: { file: File; onProgress?: (p: number) => void; signal?: AbortSignal }) =>
      emailService.importExcel(file, onProgress, signal),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.listAll }); },
  });
}
