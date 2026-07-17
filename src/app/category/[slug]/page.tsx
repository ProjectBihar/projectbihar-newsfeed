'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
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

const CATEGORY_LABELS: Record<string, string> = {
  economy: 'Economy',
  infrastructure: 'Infrastructure',
  industry: 'Industry',
  agriculture: 'Agriculture',
  education: 'Education',
  healthcare: 'Healthcare',
  environment: 'Environment',
};

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const category = slug as Category;

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'all' | 'en' | 'hi'>('all');
  const [blockedPhrases, setBlockedPhrases] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [ratings, setRatings] = useState<Record<string, string>>({});

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedPhrases = async () => {
    try {
      const res = await fetch('/api/block');
      const data = await res.json();
      const phrases = (data.phrases || []).map((p: { phrase: string }) => p.phrase);
      setBlockedPhrases(phrases);
    } catch (err) {
      console.error('Failed to fetch blocked phrases:', err);
    }
  };

  const fetchPredictions = useCallback(async (articleIds: string[]) => {
    if (articleIds.length === 0) return;
    try {
      const res = await fetch(`/api/sentiment/predict?ids=${articleIds.join(',')}`);
      const data = await res.json();
      if (data.predictions) setPredictions(data.predictions);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch('/api/sentiment');
      const data = await res.json();
      const ratingsMap: Record<string, string> = {};
      for (const r of data.ratings || []) {
        ratingsMap[r.article_id] = r.sentiment;
      }
      setRatings(ratingsMap);
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchBlockedPhrases();
    fetchRatings();
  }, []);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (a.category !== category) return false;
      if (language !== 'all' && a.language !== language) return false;
      if (isBlockedArticle(a.headline, a.synopsis, blockedPhrases)) return false;
      return true;
    });
  }, [articles, category, language, blockedPhrases]);

  useEffect(() => {
    if (filtered.length > 0) {
      fetchPredictions(filtered.map((a) => a.id));
    }
  }, [filtered, fetchPredictions]);

  const handleRated = useCallback((articleId: string, sentiment: string) => {
    setRatings((prev) => ({ ...prev, [articleId]: sentiment }));
    fetchPredictions(filtered.map((a) => a.id));
  }, [filtered, fetchPredictions]);

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

  return (
    <div>
      <Header totalArticles={filtered.length} onRefresh={() => { fetchArticles(); fetchRatings(); fetchBlockedPhrases(); }} />

      <div className="max-w-[1200px] mx-auto px-[105px] py-4">
        <div className="mb-4">
          <BlockPhraseInput
            onBlocked={handleBlocked}
            onUnblocked={handleUnblocked}
          />
        </div>

        <CategoryTabs
          active={category}
          language={language}
          onLanguageChange={(lang) => setLanguage(lang)}
        />

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading articles...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No {CATEGORY_LABELS[category] || category} articles found</p>
            <p className="text-sm">Check back after the next scrape cycle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
            {filtered.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                prediction={predictions[article.id]}
                currentSentiment={ratings[article.id]}
                onRated={(sentiment) => handleRated(article.id, sentiment)}
                onCategoryCorrected={handleCategoryCorrected}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
