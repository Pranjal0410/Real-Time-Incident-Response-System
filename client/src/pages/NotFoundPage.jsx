/**
 * NotFoundPage
 *
 * Previously every unmatched path silently redirected to /incidents, which
 * hides broken links instead of reporting them. A wrong incident URL now says
 * so and offers a way back.
 */
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, SquaresFour } from '@phosphor-icons/react';
import { useAuthStore } from '../stores';

export function NotFoundPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-[100dvh] grid place-items-center px-6 bg-primary">
      <div className="text-center" style={{ maxWidth: 420 }}>
        <span
          className="inline-grid place-items-center w-11 h-11 rounded-xl mb-5"
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--line-strong)',
            color: 'var(--text-mid)',
          }}
        >
          <Compass size={21} />
        </span>

        <p className="font-mono text-xs tracking-widest text-muted uppercase">Error 404</p>
        <h1 className="text-xl font-semibold tracking-tight mt-2">This page does not exist</h1>
        <p className="text-[14.5px] text-secondary mt-2 leading-relaxed">
          The link may be out of date, or the incident it pointed to was removed.
        </p>

        <div className="flex items-center justify-center gap-2 mt-7">
          <button type="button" onClick={() => navigate(-1)} className="btn btn--secondary">
            <ArrowLeft size={14} />
            Go back
          </button>
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/' : '/login')}
            className="btn btn--primary"
          >
            <SquaresFour size={14} />
            {isAuthenticated ? 'Overview' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
