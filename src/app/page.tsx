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

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [language, setLanguage] = useState<'all' | 'en' | 'hi'>('all');
  const [blockedPhrases, setBlockedPhrases] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const predictionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parallelize all initial fetches
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [articlesRes, blockedRes, ratingsRes] = await Promise.all([
          fetch('/api/articles'),
          fetch('/api/block'),
          fetch('/api/sentiment'),
        ]);
        if (cancelled) return;

        const [articlesData, blockedData, ratingsData] = await Promise.all([
          articlesRes.json(),
          blockedRes.json(),
          ratingsRes.json(),
        ]);
        if (cancelled) return;

        setArticles(articlesData.articles || []);
        setBlockedPhrases((blockedData.phrases || []).map((p: { phrase: string }) => p.phrase));
        const ratingsMap: Record<string, string> = {};
        for (const r of ratingsData.ratings || []) {
          ratingsMap[r.article_id] = r.sentiment;
        }
        setRatings(ratingsMap);
      } catch (err) {
        console.error('Failed to initialize:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced predictions fetch — batch into one call after articles settle
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
      if (activeCategory !== 'all' && a.category !== activeCategory) return false;
      if (language !== 'all' && a.language !== language) return false;
      if (isBlockedArticle(a.headline, a.synopsis, blockedPhrases)) return false;
      return true;
    });
  }, [articles, activeCategory, language, blockedPhrases]);

  const handleRated = useCallback((articleId: string, sentiment: string) => {
    setRatings((prev) => ({ ...prev, [articleId]: sentiment }));
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
    setLoading(true);
    Promise.all([
      fetch('/api/articles').then((r) => r.json()),
      fetch('/api/sentiment').then((r) => r.json()),
      fetch('/api/block').then((r) => r.json()),
    ]).then(([articlesData, ratingsData, blockedData]) => {
      setArticles(articlesData.articles || []);
      setBlockedPhrases((blockedData.phrases || []).map((p: { phrase: string }) => p.phrase));
      const ratingsMap: Record<string, string> = {};
      for (const r of ratingsData.ratings || []) {
        ratingsMap[r.article_id] = r.sentiment;
      }
      setRatings(ratingsMap);
    }).finally(() => setLoading(false));
  }, []);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-2 items-stretch">
            {filtered.map((article) => (
              <div key={article.id} className="animate-fade-in h-full">
                <NewsCard
                  article={article}
                  prediction={predictions[article.id]}
                  currentSentiment={ratings[article.id]}
                  onRated={(sentiment) => handleRated(article.id, sentiment)}
                  onCategoryCorrected={handleCategoryCorrected}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
