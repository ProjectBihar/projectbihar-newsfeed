'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import NewsCard from '@/components/NewsCard';
import CategoryTabs from '@/components/CategoryTabs';
import BlockPhraseInput from '@/components/BlockPhraseInput';
import { isBlockedArticle } from '@/lib/block-filter';
import type { Article } from '@/components/NewsCard';
import type { Category } from '@/scraper/config';

interface Prediction {
  sentiment: string;
  confidence: number;
}

type FeedTab = 'curated' | 'all';

const DESKTOP_PER_PAGE = 70;
const MOBILE_PER_PAGE = 50;

function SkeletonCard() {
  return (
    <div className="glass-card p-3.5 flex flex-col gap-2.5">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="flex justify-between mt-auto pt-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 mb-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="glass-pill px-3 py-1.5 text-[12px] font-medium rounded-lg disabled:opacity-30 transition-opacity"
        style={{ color: 'var(--ink-secondary)' }}
      >
        Prev
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-1 text-[12px]" style={{ color: 'var(--muted)' }}>...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-[32px] rounded-lg text-[12px] font-medium transition-all ${
              p === page
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'glass-pill hover:opacity-80'
            }`}
            style={p !== page ? { color: 'var(--ink-secondary)' } : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="glass-pill px-3 py-1.5 text-[12px] font-medium rounded-lg disabled:opacity-30 transition-opacity"
        style={{ color: 'var(--ink-secondary)' }}
      >
        Next
      </button>
    </div>
  );
}

function FeedTabSwitcher({ active, onChange, curatedCount, allCount }: { active: FeedTab; onChange: (tab: FeedTab) => void; curatedCount: number; allCount: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => onChange('curated')}
        className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
          active === 'curated'
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'glass-pill hover:opacity-80'
        }`}
        style={active !== 'curated' ? { color: 'var(--ink-secondary)' } : undefined}
      >
        Pre-Curated
        <span className="ml-1.5 text-[11px] opacity-70">({curatedCount})</span>
      </button>
      <button
        onClick={() => onChange('all')}
        className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
          active === 'all'
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'glass-pill hover:opacity-80'
        }`}
        style={active !== 'all' ? { color: 'var(--ink-secondary)' } : undefined}
      >
        All News
        <span className="ml-1.5 text-[11px] opacity-70">({allCount})</span>
      </button>
    </div>
  );
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [language, setLanguage] = useState<'all' | 'en' | 'hi'>('all');
  const [blockedPhrases, setBlockedPhrases] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [feedTab, setFeedTab] = useState<FeedTab>('curated');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const predictionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch articles based on active tab
  const fetchArticles = useCallback(async (tab: FeedTab) => {
    setLoading(true);
    try {
      const [articlesRes, blockedRes] = await Promise.all([
        fetch(`/api/articles?tab=${tab}`),
        fetch('/api/block'),
      ]);
      const [articlesData, blockedData] = await Promise.all([
        articlesRes.json(),
        blockedRes.json(),
      ]);
      setArticles(articlesData.articles || []);
      setBlockedPhrases((blockedData.phrases || []).map((p: { phrase: string }) => p.phrase));
    } catch (err) {
      console.error('Failed to initialize:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchArticles(feedTab);
  }, [feedTab, fetchArticles]);

  // Re-fetch when tab changes
  const handleTabChange = useCallback((tab: FeedTab) => {
    setFeedTab(tab);
    setPage(1);
  }, []);

  // Debounced predictions fetch
  const schedulePredictions = useCallback((articleIds: string[]) => {
    if (predictionTimer.current) clearTimeout(predictionTimer.current);
    predictionTimer.current = setTimeout(() => {
      if (articleIds.length === 0) return;
      fetch(`/api/sentiment/predict?ids=${articleIds.join(',')}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.predictions) setPredictions(data.predictions);
        })
        .catch(() => {});
    }, 300);
  }, []);

  useEffect(() => {
    if (articles.length > 0) {
      schedulePredictions(articles.map((a) => a.id));
    }
    return () => {
      if (predictionTimer.current) clearTimeout(predictionTimer.current);
    };
  }, [articles, schedulePredictions]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      // In curated tab, hide noise articles
      if (feedTab === 'curated' && a.is_noise) return false;
      if (activeCategory !== 'all' && a.category !== activeCategory) return false;
      if (language !== 'all' && a.language !== language) return false;
      if (isBlockedArticle(a.headline, a.synopsis, blockedPhrases)) return false;
      return true;
    });
  }, [articles, activeCategory, language, blockedPhrases, feedTab]);

  // Count totals for tab display
  const curatedCount = useMemo(() => articles.filter((a) => !a.is_noise).length, [articles]);
  const allCount = articles.length;

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, language, blockedPhrases, feedTab]);

  const perPage = isMobile ? MOBILE_PER_PAGE : DESKTOP_PER_PAGE;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const handleRated = useCallback((articleId: string, rating: string | null) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, user_rating: rating } : a))
    );
  }, []);

  const handleCategoryCorrected = useCallback((articleId: string, newCategory: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, category: newCategory } : a))
    );
  }, []);

  const handleBlocked = useCallback((phrase: string) => {
    setBlockedPhrases((prev) => [...prev, phrase]);
  }, []);

  const handleUnblocked = useCallback((phrase: string) => {
    setBlockedPhrases((prev) => prev.filter((p) => p !== phrase));
  }, []);

  const handleRefresh = useCallback(() => {
    fetchArticles(feedTab);
  }, [feedTab, fetchArticles]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    scrollToTop();
  }, [scrollToTop]);

  return (
    <div>
      <Header totalArticles={filtered.length} onRefresh={handleRefresh} />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[105px] py-3 sm:py-4">
        <div className="mb-3 sm:mb-4">
          <BlockPhraseInput
            onBlocked={handleBlocked}
            onUnblocked={handleUnblocked}
          />
        </div>

        <FeedTabSwitcher
          active={feedTab}
          onChange={handleTabChange}
          curatedCount={curatedCount}
          allCount={allCount}
        />

        <CategoryTabs
          active={activeCategory}
          language={language}
          onLanguageChange={(lang) => setLanguage(lang)}
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-2 items-stretch">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-full">
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No articles found</p>
            <p className="text-sm">Check back after the next scrape cycle.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-2 items-stretch">
              {paginated.map((article) => (
                <div key={article.id} className="animate-fade-in h-full">
                  <NewsCard
                    article={article}
                    prediction={predictions[article.id]}
                    onRated={(rating) => handleRated(article.id, rating)}
                    onCategoryCorrected={handleCategoryCorrected}
                  />
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />

            <p className="text-center text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
