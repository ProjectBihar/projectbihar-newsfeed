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
    <div className="flex items-center gap-2 sm:gap-3 py-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      {/* Category tabs */}
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.slug;
        return (
          <Link
            key={cat.slug}
            href={cat.slug === 'all' ? '/' : `/category/${cat.slug}`}
            className={`text-[13px] font-medium transition-all gpu-accel ${
              isActive
                ? 'bg-[var(--accent)] text-white px-3 py-1 rounded-full'
                : 'px-2 py-0.5 rounded-full hover:opacity-80'
            }`}
            style={!isActive ? { color: 'var(--ink-secondary)' } : undefined}
          >
            {cat.label}
          </Link>
        );
      })}

      {/* Separator */}
      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />

      {/* Language filter */}
      {(['all', 'en', 'hi'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange?.(lang)}
          className={`text-[13px] font-medium transition-all gpu-accel ${
            language === lang
              ? 'bg-[var(--accent)] text-white px-3 py-1 rounded-full'
              : 'px-2 py-0.5 rounded-full hover:opacity-80'
          }`}
          style={language !== lang ? { color: 'var(--ink-secondary)' } : undefined}
        >
          {lang === 'all' ? 'All' : lang === 'en' ? 'EN' : 'HI'}
        </button>
      ))}
    </div>
  );
}

export default memo(CategoryTabs);
