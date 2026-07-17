'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { CATEGORIES } from '@/lib/constants';

interface Props {
  articleId: string;
  currentCategory: string;
  onCorrected?: (newCategory: string) => void;
}

function CategoryCorrection({ articleId, currentCategory, onCorrected }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const closeDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 100);
  }, []);

  const handleCorrect = useCallback(async (newCategory: string) => {
    if (newCategory === currentCategory) {
      closeDropdown();
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/sentiment/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, corrected_category: newCategory }),
      });
      onCorrected?.(newCategory);
      closeDropdown();
    } catch (err) {
      console.error('Failed to correct category:', err);
    }
    setLoading(false);
  }, [articleId, currentCategory, onCorrected, closeDropdown]);

  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  }, [isOpen, closeDropdown]);

  return (
    <div className="relative" ref={ref}>
      {/* Edit button */}
      <button
        onClick={toggleDropdown}
        className="p-1 rounded transition-all hover:scale-110 gpu-accel"
        style={{ color: 'var(--muted)', opacity: 0.5 }}
        title="Correct category"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Category dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-50 glass-card p-2 min-w-[140px] gpu-accel"
          style={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            opacity: isClosing ? 0 : 1,
            transform: isClosing ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'opacity 100ms ease-out, transform 100ms ease-out',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
            Move to:
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleCorrect(cat.slug)}
              disabled={loading}
              className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                cat.slug === currentCategory ? 'opacity-50' : 'hover:bg-[var(--border)]'
              }`}
              style={{ color: 'var(--ink)' }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: cat.color }}
              />
              {cat.label}
            </button>
          ))}
          <button
            onClick={closeDropdown}
            className="w-full text-left px-2 py-1 rounded text-[11px] mt-1 hover:bg-[var(--border)]"
            style={{ color: 'var(--muted)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(CategoryCorrection);
