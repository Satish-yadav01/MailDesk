import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/auth-context';

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 }, mutations: { retry: 0 } } });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}<Toaster position="top-right" richColors closeButton /></AuthProvider>
    </QueryClientProvider>
  );
}
