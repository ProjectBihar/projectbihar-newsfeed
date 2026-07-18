'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

interface Props {
  totalArticles: number;
  onRefresh?: () => void;
}

interface SentimentCounts {
  positive: number;
  negative: number;
  neutral: number;
}

export default function Header({ totalArticles, onRefresh }: Props) {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [counts, setCounts] = useState<SentimentCounts>({ positive: 0, negative: 0, neutral: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  // Auth state
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getUser().then((res: any) => setUser(res.data.user));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/sentiment/counts');
      const data = await res.json();
      setCounts((prev) => {
        if (prev.positive === data.positive && prev.negative === data.negative && prev.neutral === data.neutral) return prev;
        return data;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const handleRefresh = useCallback(() => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1500);
  }, [onRefresh, refreshing]);

  const userInitial = user?.email?.charAt(0).toUpperCase() || null;

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-[105px]">
        {/* Desktop (sm+): single balanced row */}
        <div className="hidden sm:flex items-center justify-between py-3">
          {/* Left: Title */}
          <h1 className="text-[19px] font-bold tracking-tight flex-shrink-0" style={{ color: 'var(--ink)', fontWeight: 700 }}>
            PrōjectBihar Newsfeed
          </h1>

          {/* Right: Grouped controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="glass-pill flex items-center gap-1 rounded-lg px-2.5 py-1">
                <span className="text-[13px] font-bold leading-none" style={{ color: 'var(--ink)' }}>{totalArticles}</span>
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>total</span>
              </div>
              <div className="glass-pill flex items-center gap-1 rounded-lg px-2 py-1">
                <span className="text-[12px] font-bold leading-none" style={{ color: '#34C759' }}>{counts.positive}</span>
                <span className="text-[9px] font-medium" style={{ color: 'var(--muted)' }}>+</span>
              </div>
              <div className="glass-pill flex items-center gap-1 rounded-lg px-2 py-1">
                <span className="text-[12px] font-bold leading-none" style={{ color: '#FF3B30' }}>{counts.negative}</span>
                <span className="text-[9px] font-medium" style={{ color: 'var(--muted)' }}>−</span>
              </div>
              <div className="glass-pill flex items-center gap-1 rounded-lg px-2 py-1">
                <span className="text-[12px] font-bold leading-none" style={{ color: '#8E8E93' }}>{counts.neutral}</span>
                <span className="text-[9px] font-medium" style={{ color: 'var(--muted)' }}>○</span>
              </div>
            </div>

            <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="glass-pill px-3 py-1.5 text-[12px] font-medium rounded-lg disabled:opacity-50"
                style={{ color: 'var(--ink-secondary)' }}
                aria-label="Refresh articles"
              >
                {refreshing ? '...' : 'Refresh'}
              </button>
              <button
                onClick={toggleTheme}
                className="glass-pill p-2 rounded-lg"
                style={{ color: 'var(--ink-secondary)' }}
                aria-label="Toggle dark mode"
              >
                {dark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Auth button */}
              {user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="glass-pill flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
                    style={{ color: 'var(--ink-secondary)' }}
                    aria-label={user.email || 'Account menu'}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                      aria-hidden="true"
                    >
                      {userInitial}
                    </span>
                  </button>
                  {userMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 py-1 rounded-lg min-w-[160px]"
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--card-border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        zIndex: 50,
                      }}
                    >
                      <div className="px-3 py-1.5 text-[11px] truncate" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                        {user.email}
                      </div>
                      <form action="/auth/logout" method="POST">
                        <button
                          type="submit"
                          role="menuitem"
                          className="block w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--border)] transition-colors"
                          style={{ color: 'var(--ink)' }}
                        >
                          Logout
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="glass-pill px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile (< sm): two-row stacked layout */}
        <div className="flex sm:hidden flex-col py-2.5 gap-2">
          {/* Row 1: Title + Dark mode + Auth */}
          <div className="flex items-center justify-between">
            <h1 className="text-[16px] font-bold tracking-tight truncate" style={{ color: 'var(--ink)', fontWeight: 700 }}>
              PrōjectBihar Newsfeed
            </h1>
            <div className="flex items-center gap-1.5">
              {user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="glass-pill flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                    style={{ color: 'var(--ink-secondary)' }}
                    aria-label={user.email || 'Account menu'}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                      aria-hidden="true"
                    >
                      {userInitial}
                    </span>
                  </button>
                  {userMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 py-1 rounded-lg min-w-[160px]"
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--card-border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        zIndex: 50,
                      }}
                    >
                      <div className="px-3 py-1.5 text-[11px] truncate" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                        {user.email}
                      </div>
                      <form action="/auth/logout" method="POST">
                        <button
                          type="submit"
                          role="menuitem"
                          className="block w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--border)] transition-colors"
                          style={{ color: 'var(--ink)' }}
                        >
                          Logout
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="glass-pill px-2 py-1 rounded-lg text-[11px] font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Sign In
                </Link>
              )}
              <button
                onClick={toggleTheme}
                className="glass-pill p-1.5 rounded-lg flex-shrink-0"
                style={{ color: 'var(--ink-secondary)' }}
                aria-label="Toggle dark mode"
              >
                {dark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Stats + Refresh */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="glass-pill flex items-center gap-1 rounded-lg px-2 py-0.5">
              <span className="text-[12px] font-bold leading-none" style={{ color: 'var(--ink)' }}>{totalArticles}</span>
              <span className="text-[8px] font-medium uppercase" style={{ color: 'var(--muted)' }}>total</span>
            </div>
            <div className="glass-pill flex items-center gap-0.5 rounded-lg px-1.5 py-0.5">
              <span className="text-[11px] font-bold leading-none" style={{ color: '#34C759' }}>{counts.positive}</span>
              <span className="text-[8px]" style={{ color: 'var(--muted)' }}>+</span>
            </div>
            <div className="glass-pill flex items-center gap-0.5 rounded-lg px-1.5 py-0.5">
              <span className="text-[11px] font-bold leading-none" style={{ color: '#FF3B30' }}>{counts.negative}</span>
              <span className="text-[8px]" style={{ color: 'var(--muted)' }}>−</span>
            </div>
            <div className="glass-pill flex items-center gap-0.5 rounded-lg px-1.5 py-0.5">
              <span className="text-[11px] font-bold leading-none" style={{ color: '#8E8E93' }}>{counts.neutral}</span>
              <span className="text-[8px]" style={{ color: 'var(--muted)' }}>○</span>
            </div>

            <div className="ml-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="glass-pill px-2.5 py-1 text-[11px] font-medium rounded-lg disabled:opacity-50"
                style={{ color: 'var(--ink-secondary)' }}
                aria-label="Refresh articles"
              >
                {refreshing ? '...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
