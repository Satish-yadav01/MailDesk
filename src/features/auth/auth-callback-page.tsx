import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/misc';
import { toApiError } from '@/lib/api-errors';
import { AuthLayout } from './auth-layout';
import { useAuth } from './auth-context';

export function AuthCallbackPage() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const tokenType = params.get('tokenType') || 'Bearer';
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);

    if (!token) {
      setError('Google sign-in did not return an access token. Please try again.');
      return;
    }

    const finishSignIn = async () => {
      try {
        await completeOAuth(token, tokenType);
        navigate('/app', { replace: true });
      } catch (error) {
        const apiError = toApiError(error);
        setError(apiError.isNetwork
          ? 'Could not reach the account lookup service. Check its URL and CORS settings for this deployment.'
          : apiError.message);
      }
    };
    void finishSignIn();
  }, [completeOAuth, navigate]);

  return (
    <AuthLayout
      title="Signing you in"
      subtitle="Completing Google sign-in and opening your MailDesk workspace."
      footer={<Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Back to sign in</Link>}
    >
      {error ? <Alert variant="error">{error}</Alert> : <p role="status" className="text-sm text-slate-600">Please wait…</p>}
    </AuthLayout>
  );
}
