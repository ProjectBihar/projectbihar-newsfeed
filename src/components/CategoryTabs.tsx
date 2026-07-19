'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/scraper/config';

interface CategoryTabsProps {
  active?: Category | 'all';
  onChange?: (category: Category | 'all') => void;
  currentTab?: 'curated' | 'all';
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

function CategoryTabs({ active = 'all', onChange, currentTab = 'curated' }: CategoryTabsProps) {
  const router = useRouter();

  const handleClick = (slug: Category | 'all') => {
    if (onChange) {
      onChange(slug);
    } else {
      router.push(slug === 'all' ? '/' : `/category/${slug}?tab=${currentTab}`);
    }
  };

  return (
    <div className="relative mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide whitespace-nowrap">
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => handleClick(cat.slug)}
              className={`inline-flex items-center text-[13px] font-medium transition-all gpu-accel flex-shrink-0 ${
                isActive
                  ? 'bg-[var(--accent)] text-white px-3.5 py-1.5 rounded-full shadow-sm'
                  : 'px-3 py-1.5 rounded-full hover:bg-[var(--border)]'
              }`}
              style={!isActive ? { color: 'var(--ink-secondary)' } : undefined}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(CategoryTabs);
