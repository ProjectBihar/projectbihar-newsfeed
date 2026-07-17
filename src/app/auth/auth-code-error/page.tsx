import Link from 'next/link';

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="glass-card p-8 text-center max-w-sm">
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Authentication Error</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Something went wrong during sign-in. Please try again.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
