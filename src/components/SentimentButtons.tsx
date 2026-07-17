'use client';

import { useState } from 'react';

interface Props {
  articleId: string;
  currentSentiment?: string;
  onRated?: (sentiment: string) => void;
}

export default function SentimentButtons({ articleId, currentSentiment, onRated }: Props) {
  const [selected, setSelected] = useState<string | null>(currentSentiment || null);
  const [loading, setLoading] = useState(false);

  const handleRate = async (sentiment: string) => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, sentiment }),
      });
      setSelected(sentiment);
      onRated?.(sentiment);
    } catch (err) {
      console.error('Failed to rate:', err);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Positive (Thumbs Up) */}
      <button
        onClick={() => handleRate('positive')}
        disabled={loading}
        className="p-1 rounded transition-all hover:scale-110"
        style={{
          color: selected === 'positive' ? '#34C759' : 'var(--muted)',
          opacity: selected === 'positive' ? 1 : 0.5,
        }}
        title="Positive"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={selected === 'positive' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </button>

      {/* Negative (Thumbs Down) */}
      <button
        onClick={() => handleRate('negative')}
        disabled={loading}
        className="p-1 rounded transition-all hover:scale-110"
        style={{
          color: selected === 'negative' ? '#FF3B30' : 'var(--muted)',
          opacity: selected === 'negative' ? 1 : 0.5,
        }}
        title="Negative"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={selected === 'negative' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </button>

      {/* Neutral (Minus) */}
      <button
        onClick={() => handleRate('neutral')}
        disabled={loading}
        className="p-1 rounded transition-all hover:scale-110"
        style={{
          color: selected === 'neutral' ? '#8E8E93' : 'var(--muted)',
          opacity: selected === 'neutral' ? 1 : 0.5,
        }}
        title="Neutral"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
