import { memo } from 'react';
import { CATEGORIES } from '@/lib/constants';
import type { Category } from '@/scraper/config';
import SentimentButtons from './SentimentButtons';
import CategoryCorrection from './CategoryCorrection';

export interface Article {
  id: string;
  url: string;
  headline: string;
  synopsis: string;
  source: string;
  language: string;
  category: string | null;
  is_noise: boolean;
  user_rating: string | null;
  published_timestamp: number;
  ingested_at: number;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function getCategoryMeta(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) || CATEGORIES[0];
}

interface Props {
  article: Article;
  prediction?: { sentiment: string; confidence: number };
  onRated?: (rating: string | null) => void;
  onCategoryCorrected?: (articleId: string, update: { category?: string; is_noise?: boolean }) => void;
}

function NewsCard({ article, prediction, onRated, onCategoryCorrected }: Props) {
  const cat = article.category ? getCategoryMeta(article.category) : null;

  const predictionColor = prediction?.sentiment === 'positive' ? '#34C759'
    : prediction?.sentiment === 'negative' ? '#FF3B30'
    : 'transparent';

  const showBorder = prediction && prediction.sentiment !== 'neutral' && prediction.confidence > 0;

  return (
    <article className="glass-card p-4 sm:p-5 flex flex-col relative gpu-accel">
      {/* Predicted sentiment dot on left border */}
      {showBorder && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: predictionColor, opacity: prediction.confidence }}
        />
      )}

      {/* Category badge + correction button */}
      <div className="flex items-center gap-2 mb-3">
        {cat && !article.is_noise && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: `${cat.color}0A`,
              color: `${cat.color}bb`,
              border: `1px solid ${cat.color}15`,
            }}
          >
            {article.category}
          </span>
        )}
        {article.is_noise && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: 'rgba(255,59,48,0.08)', color: 'rgba(255,59,48,0.7)', border: '1px solid rgba(255,59,48,0.12)' }}>
            noise
          </span>
        )}
        <CategoryCorrection
          articleId={article.id}
          currentCategory={article.category ?? ''}
          isNoise={article.is_noise}
          onCorrected={(update) => onCategoryCorrected?.(article.id, update)}
        />
      </div>

      {/* Headline */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-3 flex-1 group"
      >
        <h3
          className="text-[14.5px] sm:text-[15px] font-normal leading-[1.5] transition-colors group-hover:text-[var(--accent)]"
          style={{ color: 'var(--ink)' }}
        >
          {article.headline}
        </h3>
      </a>

      {/* Bottom row — separated by spacing, no divider line */}
      <div className="flex items-center justify-between mt-auto pt-3 gap-2">
        <span className="text-[11px] sm:text-[12px] leading-tight min-w-0 truncate flex-shrink" style={{ color: 'var(--muted)' }}>
          {article.source} · {timeAgo(article.published_timestamp)}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <SentimentButtons
            articleId={article.id}
            currentRating={article.user_rating}
            onRated={onRated}
          />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] sm:text-[12px] font-medium hover:underline hidden sm:inline"
            style={{ color: 'var(--accent)' }}
          >
            Source
          </a>
        </div>
      </div>
    </article>
  );
}

export default memo(NewsCard);
