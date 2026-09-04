import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Loader2, Sun, Moon, Eye, EyeOff, Shield, TrendingUp, FileText, Users } from 'lucide-react';

const FEATURES = [
  { icon: Shield,     text: 'AI-powered RAMS & risk assessment' },
  { icon: FileText,   text: 'Full permit to work workflow' },
  { icon: TrendingUp, text: 'Live LTIR / TRIR / DART dashboards' },
  { icon: Users,      text: 'Training matrix & competency tracking' },
];

// DEMO_ACCOUNTS removed along with the panel that used them — see LoginScreen below.

export const LoginScreen: React.FC = () => {
  const { login, signup, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mode, setMode] = useState<'signin' | 'activate'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [activated, setActivated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setLocalError('Please enter your email and password.'); return; }
    setLocalError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password || !confirmPassword) {
      setLocalError('Please fill in every field.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    setLocalError('');
    setIsLoading(true);
    try {
      await signup(email, password, name.trim());
      setActivated(true);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setLocalError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setLocalError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setLocalError('That email address looks invalid.');
      } else {
        setLocalError(err.message || 'Could not activate this account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: 'signin' | 'activate') => {
    setMode(next);
    setLocalError('');
    setActivated(false);
    setPassword('');
    setConfirmPassword('');
  };
  const handleGoogle = async () => {
    setLocalError('Google sign-in is not configured yet. Please use email and password.');
  };

  // handleDemo removed along with the demo-accounts panel that called it.

  const busy = isLoading || loading;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* ── Left panel (branding) ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-10"
        style={{ background: theme === 'dark' ? '#13151a' : '#f0fdf4', borderRight: '1px solid var(--border-default)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#10b981' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>EviroSafe</span>
            <span className="text-xs ml-2 font-medium" style={{ color: '#10b981' }}>HSE Platform</span>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Intelligent safety<br />
            <span style={{ color: '#10b981' }}>for every site.</span>
          </h1>
          <p className="text-base mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            EviroSafe brings together permits, incidents, training, audits and compliance into one unified platform — powered by AI.
          </p>
          <div className="space-y-4">
            {FEATURES.map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <f.icon className="w-4 h-4" style={{ color: '#10b981' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: '16+', label: 'HSE Modules' },
            { value: 'AI', label: 'Powered RAMS' },
            { value: 'ISO', label: '45001 Aligned' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
              <p className="text-xl font-bold" style={{ color: '#10b981' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (login form) ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">

        {/* Theme toggle + mobile logo */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          {/* Theme chooser */}
          <div className="flex items-center rounded-xl p-1 gap-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <button onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'light' ? 'text-white' : ''}`}
              style={theme === 'light' ? { background: '#10b981', color: 'white' } : { color: 'var(--text-muted)' }}>
              <Sun className="w-3.5 h-3.5" />Light
            </button>
            <button onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all`}
              style={theme === 'dark' ? { background: '#10b981', color: 'white' } : { color: 'var(--text-muted)' }}>
              <Moon className="w-3.5 h-3.5" />Dark
            </button>
          </div>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#10b981' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>EviroSafe</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {mode === 'signin' ? 'Sign in to EviroSafe' : 'Activate your account'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'signin' ? 'Enter your credentials to access the platform' : 'Use the email address your admin invited — this sets your password.'}
            </p>
          </div>

          {mode === 'signin' && (
          <>
          {/* Google sign in */}
          <button onClick={handleGoogle} disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium mb-4 transition-all hover:opacity-90 active:scale-98 disabled:opacity-50"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1" style={{ height: '1px', background: 'var(--border-default)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or email</span>
            <div className="flex-1" style={{ height: '1px', background: 'var(--border-default)' }} />
          </div>
          </>
          )}

          {/* Form */}
          {activated ? (
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#10b981' }}>Account activated</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>You can sign in now with your new password.</p>
              <button onClick={() => switchMode('signin')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#10b981', color: 'white' }}>
                Go to Sign In
              </button>
            </div>
          ) : (
          <form onSubmit={mode === 'signin' ? handleSubmit : handleActivate} className="space-y-3">
            {mode === 'activate' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Jane Doe" autoComplete="name" required />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Work Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoComplete="email" required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'signin' ? 'Password' : 'Create a Password'}
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {mode === 'activate' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password" required />
              </div>
            )}

            {localError && (
              <div className="rounded-xl p-3 text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                {localError}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: '#10b981', color: 'white' }}>
              {busy
                ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'signin' ? 'Signing in...' : 'Activating...'}</>
                : (mode === 'signin' ? 'Sign In' : 'Activate Account')}
            </button>
          </form>
          )}

          {/* Mode toggle */}
          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            {mode === 'signin' ? (
              <>Been invited but don't have a password yet?{' '}
                <button onClick={() => switchMode('activate')} className="font-semibold" style={{ color: '#10b981' }}>Activate your account</button>
              </>
            ) : (
              <>Already activated?{' '}
                <button onClick={() => switchMode('signin')} className="font-semibold" style={{ color: '#10b981' }}>Sign in</button>
              </>
            )}
          </p>

          {/* Demo accounts panel removed — it exposed working hardcoded admin
              credentials (admin@guardiq.com / demo1234) to any visitor, no
              invite or account required. See handleDemo() history if this
              needs to be reintroduced properly (e.g. gated behind an env
              var that's never set in production, with rotated passwords). */}
        </div>
      </div>
    </div>
  );
};