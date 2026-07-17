'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES } from '@/lib/constants';
import type { Category } from '@/scraper/config';

const CATEGORY_ICONS: Record<Category, string> = {
  economy: '📊',
  infrastructure: '🏗️',
  industry: '🏭',
  agriculture: '🌾',
  education: '📚',
  healthcare: '🏥',
  environment: '🌿',
  governance: '🏛️',
  exclude: '🚫',
};
  exclude: '🚫',
};

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (slug: string) => {
    if (slug === 'all') return pathname === '/';
    return pathname === `/category/${slug}`;
  };

  return (
    <aside className="hidden md:flex w-[220px] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-4 flex-shrink-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-6 px-2">
        <span className="text-lg font-bold text-[var(--color-ink)] tracking-tight">
          Bihar News
        </span>
      </Link>

      {/* Search-like input (decorative) */}
      <div className="mb-4 px-2">
        <div className="flex items-center gap-2 bg-[var(--color-paper)] rounded-lg px-3 py-2 text-sm text-[var(--color-muted)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </div>
      </div>

      {/* Categories */}
      <nav className="flex-1 space-y-1">
        <Link
          href="/"
          className={`sidebar-link ${isActive('all') ? 'active' : ''}`}
        >
          <span className="text-base">📰</span>
          <span>All News</span>
        </Link>

        <div className="pt-3 pb-1 px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Categories
          </span>
        </div>

        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className={`sidebar-link ${isActive(cat.slug) ? 'active' : ''}`}
          >
            <span className="text-base">{CATEGORY_ICONS[cat.slug]}</span>
            <span>{cat.label}</span>
          </Link>
        ))}
      </nav>

      {/* Block phrases button */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <button
          onClick={() => {
            const dialog = document.getElementById('block-dialog') as HTMLDialogElement;
            dialog?.showModal();
          }}
          className="sidebar-link w-full text-[var(--color-muted)] hover:text-red-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-sm">Block Phrases</span>
        </button>
      </div>
    </aside>
  );
}
