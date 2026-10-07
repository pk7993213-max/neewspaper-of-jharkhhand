import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { NewspaperLogo } from '../common/NewspaperLogo';
import { ShieldCheck, Mail, Lock, User, AlertCircle, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export const CMSLogin: React.FC = () => {
  const { loginGoogle, loginEmail, registerEmail } = useAuth();
  const { navigate } = useRouter();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginGoogle();
      navigate('/cms');
    } catch (err: unknown) {
      console.error('Google login error:', err);
      const msg = err instanceof Error ? err.message : 'Google sign-in was canceled or failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isRegisterMode) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await registerEmail(email, password, displayName || 'Staff Reporter');
      } else {
        await loginEmail(email, password);
      }
      navigate('/cms');
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password. Please verify your credentials or register a staff account.');
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-stone-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-red-950/80 rounded-full border border-red-800 text-red-400">
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>
        <div className="flex justify-center my-2">
          <NewspaperLogo variant="cms" />
        </div>
        <p className="mt-1 text-center text-xs tracking-wider uppercase text-stone-400 font-semibold">
          Secure Editorial Newsroom CMS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-stone-800 py-8 px-6 shadow-2xl rounded-lg border border-stone-700 sm:px-10">
          {/* RBAC Notice */}
          <div className="mb-6 p-3 bg-stone-900/80 border border-stone-700 rounded text-xs text-stone-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Staff RBAC Access:</span> Authorized newsroom personnel only. Access tier (Admin, Editor, Reporter) is enforced server-side.
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-900/40 border border-red-700 text-red-200 text-xs rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Real Google Sign-in */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-stone-100 text-stone-900 font-semibold text-sm rounded shadow transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.9.7 5.5 1.9 7.9l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-stone-800 px-2 text-stone-400 font-semibold tracking-wider">
                Or with Staff Email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Full Name / Byline
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-3 py-2 bg-stone-900 border border-stone-700 rounded text-stone-100 text-sm focus:outline-none focus:border-red-500"
                  />
                  <User className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Newsroom Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="journalist@bharatchronicle.in"
                  className="w-full pl-10 pr-3 py-2 bg-stone-900 border border-stone-700 rounded text-stone-100 text-sm focus:outline-none focus:border-red-500"
                />
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2 bg-stone-900 border border-stone-700 rounded text-stone-100 text-sm focus:outline-none focus:border-red-500"
                />
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#800000] hover:bg-red-900 text-white font-semibold py-2.5 px-4 rounded text-sm transition-colors shadow disabled:opacity-50"
            >
              {loading
                ? 'Authenticating...'
                : isRegisterMode
                ? 'Create Staff Account'
                : 'Sign In to Newsroom'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-stone-400 pt-4 border-t border-stone-700">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-stone-300 hover:text-white underline"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : 'New reporter? Register account'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-stone-400 hover:text-stone-200 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Public Site</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
