import { createBrowserRouter, Link, Navigate, type RouteObject } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthCallbackPage } from '@/features/auth/auth-callback-page';
import { LoginPage, RegisterPage } from '@/features/auth/auth-pages';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { BulkEmailPage } from '@/features/emails/bulk-email-page';
import { CreateEmailPage } from '@/features/emails/create-email-page';
import { EmailListPage } from '@/features/emails/email-list-page';
import { TransactionsPage } from '@/features/emails/transactions-page';
import { ImportPage } from '@/features/email-import/import-page';
import { LandingPage } from '@/features/landing/landing-page';
import { MailSenderPage } from '@/features/mail-sender/mail-sender-page';

function NotFound() {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center"><h1 className="text-2xl font-semibold">Page not found</h1><Link className="text-brand-600" to="/">Go home</Link></div>;
}

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      path: '/app', element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'emails', element: <EmailListPage /> },
        { path: 'emails/new', element: <CreateEmailPage /> },
        { path: 'emails/bulk', element: <BulkEmailPage /> },
        { path: 'import', element: <ImportPage /> },
        { path: 'transactions', element: <TransactionsPage /> },
        { path: 'mail-sender', element: <MailSenderPage /> },
        { path: '*', element: <Navigate to="/app" replace /> },
      ],
    }],
  },
  { path: '*', element: <NotFound /> },
];

export const router = createBrowserRouter(routes);
