'use client';

import { memo } from 'react';
import Link from 'next/link';
import type { Category } from '@/scraper/config';

interface CategoryTabsProps {
  active?: Category | 'all';
  language?: 'all' | 'en' | 'hi';
  onLanguageChange?: (lang: 'all' | 'en' | 'hi') => void;
}

const CATEGORIES: { slug: Category | 'all'; label: string }[] = [
  { slug: 'all', label: 'All' },
  { slug: 'economy', label: 'Economy' },
  { slug: 'infrastructure', label: 'Infrastructure' },
  { slug: 'industry', label: 'Industry' },
  { slug: 'agriculture', label: 'Agriculture' },
  { slug: 'education', label: 'Education' },
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'environment', label: 'Environment' },
  { slug: 'governance', label: 'Governance' },
];

function CategoryTabs({ active = 'all', language = 'all', onLanguageChange }: CategoryTabsProps) {
  return (
    <div className="relative mb-4">
      {/* Horizontal scrollable container */}
      <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {/* Category tabs */}
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={cat.slug === 'all' ? '/' : `/category/${cat.slug}`}
              className={`inline-flex items-center text-[13px] font-medium transition-all gpu-accel flex-shrink-0 ${
                isActive
                  ? 'bg-[var(--accent)] text-white px-3.5 py-1.5 rounded-full shadow-sm'
                  : 'px-3 py-1.5 rounded-full hover:bg-[var(--border)]'
              }`}
              style={!isActive ? { color: 'var(--ink-secondary)' } : undefined}
            >
              {cat.label}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="w-px h-4 mx-1 flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />

        {/* Language filter */}
        {(['all', 'en', 'hi'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => onLanguageChange?.(lang)}
            className={`inline-flex items-center text-[13px] font-medium transition-all gpu-accel flex-shrink-0 ${
              language === lang
                ? 'bg-[var(--accent)] text-white px-3.5 py-1.5 rounded-full shadow-sm'
                : 'px-3 py-1.5 rounded-full hover:bg-[var(--border)]'
            }`}
            style={language !== lang ? { color: 'var(--ink-secondary)' } : undefined}
          >
            {lang === 'all' ? 'All' : lang === 'en' ? 'EN' : 'HI'}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(CategoryTabs);
