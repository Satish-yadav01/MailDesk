import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { emailService } from '@/services/email-service';
import { mailService } from '@/services/mail-service';
import type { EmailRecordInput, TransactionStatus } from '@/types/api';

export const keys = {
  list: (userId: string, page: number, size: number) => ['emails', 'list', userId, page, size] as const,
  listAll: ['emails', 'list'] as const,
  transactions: (userId: string, page: number, size: number) => ['emails', 'transactions', userId, page, size] as const,
  pendingTransaction: (userId: string, tid: string) => ['emails', 'pending-transaction', userId, tid] as const,
  headers: (userId: string) => ['emails', 'headers', userId] as const,
  tx: (userId: string, tid: string) => ['emails', 'tx', userId, tid] as const,
  health: (userId: string) => ['mail', 'health', userId] as const,
};

export const useEmailList = (page: number, size: number) => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: keys.list(userId ?? '', page, size),
    queryFn: ({ signal }) => emailService.list(page, size, signal),
    enabled: !!userId,
    placeholderData: (prev) => prev,
  });
};

export const useTransactions = (userId: string | null, page: number, size: number) =>
  useQuery({
    queryKey: keys.transactions(userId ?? '', page, size),
    enabled: !!userId,
    queryFn: ({ signal }) => emailService.listTransactions(userId!, page, size, signal),
    placeholderData: (previous) => previous,
  });

export const PENDING_STATUS_REFRESH_INTERVAL_MS = 24_000;
export const MAX_PENDING_STATUS_REFRESHES = 5;

export function usePendingTransactionStatus(transaction: TransactionStatus) {
  const { userId } = useAuth();
  const refreshes = useRef(0);
  const query = useQuery({
    queryKey: keys.pendingTransaction(userId ?? '', transaction.tid),
    queryFn: ({ signal }) => {
      refreshes.current += 1;
      return emailService.getTransaction(transaction.tid, signal);
    },
    initialData: transaction,
    enabled: !!userId,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (current) =>
      current.state.data?.isTerminal || refreshes.current >= MAX_PENDING_STATUS_REFRESHES
        ? false
        : PENDING_STATUS_REFRESH_INTERVAL_MS,
  });
  return { ...query, refreshCount: refreshes.current };
}

export const useEmailHeaders = () => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: keys.headers(userId ?? ''),
    queryFn: ({ signal }) => emailService.getHeaders(signal),
    enabled: !!userId,
    staleTime: 10 * 60_000,
  });
};

export const useServiceHealth = () => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: keys.health(userId ?? ''),
    queryFn: ({ signal }) => mailService.health(signal),
    enabled: !!userId,
    refetchInterval: 60_000,
    retry: false,
  });
};

export const MAX_POLLS = 60;
const POLL_MS = 2000;

/** Polls the enquiry endpoint every 2s until a terminal status (or MAX_POLLS). */
export function useTransaction(tid: string | null) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.tx(userId ?? '', tid ?? ''),
    enabled: !!tid && !!userId,
    queryFn: ({ signal }) => emailService.getTransaction(tid!, signal),
    refetchInterval: (q) => (q.state.data?.isTerminal || q.state.dataUpdateCount >= MAX_POLLS ? false : POLL_MS),
  });
  const polls = qc.getQueryState(keys.tx(userId ?? '', tid ?? ''))?.dataUpdateCount ?? 0;
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
