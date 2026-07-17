'use client';

import { useEffect, useState, useCallback } from 'react';

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
  const [dark, setDark] = useState(false);
  const [counts, setCounts] = useState<SentimentCounts>({ positive: 0, negative: 0, neutral: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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

  const handleRefresh = useCallback(() => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1500);
  }, [onRefresh, refreshing]);

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[105px]">
        {/* Row 1: Title + Dark mode */}
        <div className="flex items-center justify-between py-2.5 sm:py-3">
          <h1 className="text-[16px] sm:text-[18px] font-bold tracking-tight truncate" style={{ color: 'var(--ink)' }}>
            PrōjectBihar Newsfeed
          </h1>
          <button
            onClick={toggleTheme}
            className="glass-pill p-2 rounded-lg flex-shrink-0"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Row 2: Stats + Refresh — wraps on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 flex-wrap">
          <div className="glass-pill flex items-center gap-1 rounded-lg px-2.5 py-1">
            <span className="text-[14px] font-bold leading-none" style={{ color: 'var(--ink)' }}>{totalArticles}</span>
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

          <div className="ml-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="glass-pill px-3 py-1.5 text-[12px] font-medium rounded-lg disabled:opacity-50"
              style={{ color: 'var(--ink-secondary)' }}
            >
              {refreshing ? '...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
