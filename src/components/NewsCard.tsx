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
  category: string;
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
  currentSentiment?: string;
  onRated?: (sentiment: string) => void;
  onCategoryCorrected?: (articleId: string, newCategory: string) => void;
}

export default function NewsCard({ article, prediction, currentSentiment, onRated, onCategoryCorrected }: Props) {
  const cat = getCategoryMeta(article.category);

  const predictionColor = prediction?.sentiment === 'positive' ? '#34C759'
    : prediction?.sentiment === 'negative' ? '#FF3B30'
    : 'transparent';

  const predictionOpacity = prediction?.confidence || 0;

  return (
    <article className="glass-card p-3.5 flex flex-col relative">
      {/* Predicted sentiment dot on left border */}
      {prediction && prediction.sentiment !== 'neutral' && prediction.confidence > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: predictionColor, opacity: predictionOpacity }}
        />
      )}

      {/* Category badge + correction button */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide"
          style={{ backgroundColor: `${cat.color}10`, color: `${cat.color}cc` }}
        >
          {article.category}
        </span>
        <CategoryCorrection
          articleId={article.id}
          currentCategory={article.category}
          onCorrected={(newCat) => onCategoryCorrected?.(article.id, newCat)}
        />
      </div>

      {/* Headline */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-2.5 flex-1"
      >
        <h3 className="text-[14px] font-medium leading-snug transition-colors hover:text-[var(--accent)]" style={{ color: 'var(--ink)' }}>
          {article.headline}
        </h3>
      </a>

      {/* Bottom row: source + time + sentiment buttons */}
      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
          {article.source} / {timeAgo(article.published_timestamp)}
        </span>
        <div className="flex items-center gap-3">
          <SentimentButtons
            articleId={article.id}
            currentSentiment={currentSentiment}
            onRated={onRated}
          />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Source
          </a>
        </div>
      </div>
    </article>
  );
}
