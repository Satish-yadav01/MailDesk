import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form';
import { Alert } from '@/components/ui/misc';
import { toApiError } from '@/lib/api-errors';
import { loginSchema, registerSchema } from '@/lib/validators';
import { useAuth } from './auth-context';
import { AuthLayout } from './auth-layout';

const linkCls = 'font-medium text-brand-600 hover:text-brand-700';
const googleOAuthUrl = import.meta.env.VITE_GOOGLE_OAUTH_URL ?? 'http://localhost:8081/oauth2/authorization/google';

function GoogleSignInButton() {
  return (
    <Button asChild variant="secondary" className="w-full">
      <a href={googleOAuthUrl}>
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
          <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
          <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
        </svg>
        Continue with Google
      </a>
    </Button>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/app';
  const [error, setError] = useState<string | null>(null);
  const f = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const onSubmit = f.handleSubmit(async (v) => {
    setError(null);
    try { await login(v.email, v.password); toast.success('Signed in'); nav(from, { replace: true }); }
    catch (e) { setError(toApiError(e).message); }
  });
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your MailDesk workspace."
      footer={<>New to MailDesk? <Link to="/register" className={linkCls}>Create an account</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@company.com" required error={f.formState.errors.email?.message} {...f.register('email')} />
        <TextField label="Password" type="password" autoComplete="current-password" placeholder="Your password" required error={f.formState.errors.password?.message} {...f.register('password')} />
        <Button type="submit" className="w-full" loading={f.formState.isSubmitting}>Sign in</Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
      <GoogleSignInButton />
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const f = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { email: '', password: '', confirm: '' } });
  const onSubmit = f.handleSubmit(async (v) => {
    setError(null);
    try { await signUp(v.email, v.password); toast.success('Account created'); nav('/app', { replace: true }); }
    catch (e) { setError(toApiError(e).message); }
  });
  const e = f.formState.errors;
  return (
    <AuthLayout title="Create your account" subtitle="Register to get started with MailDesk."
      footer={<>Already have an account? <Link to="/login" className={linkCls}>Sign in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <TextField label="Work email" type="email" autoComplete="email" placeholder="you@company.com" required error={e.email?.message} {...f.register('email')} />
        <TextField label="Password" type="password" autoComplete="new-password" placeholder="At least 6 characters" required error={e.password?.message} {...f.register('password')} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" required error={e.confirm?.message} {...f.register('confirm')} />
        <Button type="submit" className="w-full" loading={f.formState.isSubmitting}>Create account</Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
      <GoogleSignInButton />
    </AuthLayout>
  );
}
