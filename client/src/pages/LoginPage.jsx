/**
 * LoginPage
 *
 * Split composition rather than a lone centred card on an empty page: the form
 * sits left, and the right panel states what the product actually does. Adds
 * inline validation, a password reveal, and one-click demo sign-in so the
 * credentials in the footer are not something you have to retype.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PulseIcon,
  Eye,
  EyeSlash,
  WarningCircle,
  CircleNotch,
  Users,
  ClockCounterClockwise,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useAuthStore } from '../stores';
import { authApi } from '../services/api';

const DEMO_ACCOUNTS = [
  { email: 'admin@demo.com', password: 'demo123', label: 'Admin', hint: 'Full access' },
  { email: 'viewer@demo.com', password: 'demo123', label: 'Viewer', hint: 'Read-only' },
];

const CAPABILITIES = [
  {
    icon: <PulseIcon size={17} weight="bold" />,
    title: 'Server-authoritative state',
    body: 'Every status change is confirmed by the server before it renders, so two responders never see different truths.',
  },
  {
    icon: <Users size={17} />,
    title: 'Presence and focus',
    body: 'See who is on the incident and which field they are editing before you overwrite their work.',
  },
  {
    icon: <ClockCounterClockwise size={17} />,
    title: 'Immutable timeline',
    body: 'Notes, assignments and transitions are appended, never edited. The postmortem writes itself.',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setError = useAuthStore((state) => state.setError);
  const error = useAuthStore((state) => state.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!email.trim()) {
      next.email = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'That does not look like a valid email address.';
    }
    if (!password) {
      next.password = 'Enter your password.';
    } else if (isRegister && password.length < 6) {
      next.password = 'Use at least 6 characters.';
    }
    if (isRegister && !name.trim()) {
      next.name = 'Enter the name your team will see.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = isRegister
        ? await authApi.register(credentials)
        : await authApi.login(credentials);
      setAuth(response.user, response.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isLoading || !validate()) return;
    submit(
      isRegister
        ? { email: email.trim(), password, name: name.trim() }
        : { email: email.trim(), password }
    );
  };

  const signInAsDemo = (account) => {
    if (isLoading) return;
    setIsRegister(false);
    setFieldErrors({});
    setEmail(account.email);
    setPassword(account.password);
    submit({ email: account.email, password: account.password });
  };

  return (
    // Context panel leads on the left, form sits on the right — the reading
    // order runs pitch → action, and the form lands under the cursor's
    // natural resting side on a wide screen.
    <div className="min-h-[100dvh] grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] bg-primary">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-12 lg:order-2">
        <motion.div
          className="w-full"
          style={{ maxWidth: 360 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="flex items-center gap-2.5 mb-8">
            <span className="sidebar__logo-icon" style={{ width: 30, height: 30, borderRadius: 9 }}>
              <PulseIcon size={17} weight="bold" />
            </span>
            <span className="text-[16px] font-semibold tracking-tight">IncidentHub</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {isRegister ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="text-[14.5px] text-secondary mt-1.5">
            {isRegister
              ? 'Join your team’s incident channel.'
              : 'Pick up the incident channel where your team left it.'}
          </p>

          {error && (
            <div className="alert alert--error mt-5" role="alert">
              <WarningCircle size={16} weight="fill" className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            {isRegister && (
              <div>
                <label className="label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className="input"
                  placeholder="Priya Raghavan"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                {fieldErrors.name && (
                  <p id="name-error" className="field-error" role="alert">
                    <WarningCircle size={13} weight="fill" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className="input"
                placeholder="you@company.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="field-error" role="alert">
                  <WarningCircle size={13} weight="fill" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className="input"
                  style={{ paddingRight: 38 }}
                  placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-md text-muted hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="field-error" role="alert">
                  <WarningCircle size={13} weight="fill" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn btn--primary btn--lg w-full mt-1">
              {isLoading ? (
                <>
                  <CircleNotch size={15} className="animate-spin" />
                  {isRegister ? 'Creating account' : 'Signing in'}
                </>
              ) : isRegister ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsRegister((value) => !value);
              setFieldErrors({});
              setError(null);
            }}
            className="mt-4 text-[14px] text-secondary hover:text-primary transition-colors"
          >
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </button>

          {/* Demo accounts are one click, not something to copy by hand */}
          <div className="mt-8 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2.5">
              Try a demo account
            </p>
            <div className="flex gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => signInAsDemo(account)}
                  disabled={isLoading}
                  className="btn btn--secondary btn--sm flex-1"
                  title={`Sign in as ${account.email}`}
                >
                  {account.label}
                  <span className="text-muted font-normal">· {account.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Context side. Hidden below lg so the form never fights for space. */}
      <aside
        className="hidden lg:flex flex-col justify-center px-14 py-12 relative overflow-hidden lg:order-1"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--line)' }}
      >
        {/* Faint radial wash, not a mesh gradient — keeps the panel from reading flat */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(70% 55% at 78% 12%, rgba(232, 234, 237, 0.05), transparent 68%)',
          }}
        />

        <div className="relative" style={{ maxWidth: 460 }}>
          <div className="flex items-center gap-2 mb-6">
            <span className="signal-dot signal-dot--pulse" style={{ background: 'var(--signal-low)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--signal-low)' }}>
              Real-time incident coordination
            </span>
          </div>

          <p className="text-[28px] leading-[1.25] font-medium tracking-tight text-primary">
            When production breaks, the worst place to lose time is arguing about what the current
            state is.
          </p>

          <ul className="mt-9 flex flex-col gap-6">
            {CAPABILITIES.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span
                  className="w-8 h-8 rounded-[9px] grid place-items-center flex-shrink-0"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--line-strong)',
                    color: 'var(--text-mid)',
                  }}
                >
                  {item.icon}
                </span>
                <div>
                  <p className="text-[14.5px] font-medium text-primary">{item.title}</p>
                  <p className="text-[14px] text-secondary mt-1 leading-relaxed">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div
            className="mt-10 pt-5 flex items-center gap-2 text-xs text-muted"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <ShieldCheck size={14} />
            Role-based access. Viewers observe, responders act, admins assign.
          </div>
        </div>
      </aside>
    </div>
  );
}

export default LoginPage;
