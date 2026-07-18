'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES } from '@/lib/constants';

interface Props {
  articleId: string;
  currentCategory: string;
  isNoise?: boolean;
  onCorrected?: (update: { category?: string; is_noise?: boolean }) => void;
}

function CategoryCorrection({ articleId, currentCategory, isNoise, onCorrected }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    const handleScroll = () => updatePosition();
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updatePosition]);

  const closeDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 100);
  }, []);

  const handleCorrect = useCallback((newCategory: string) => {
    if (newCategory === currentCategory && !isNoise) {
      closeDropdown();
      return;
    }
    onCorrected?.({ category: newCategory, is_noise: false });
    closeDropdown();
    fetch('/api/sentiment/correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId, corrected_category: newCategory, is_noise: false }),
    }).catch((err) => console.error('Failed to correct category:', err));
  }, [articleId, currentCategory, isNoise, onCorrected, closeDropdown]);

  const handleMarkNoise = useCallback(() => {
    if (isNoise) {
      closeDropdown();
      return;
    }
    onCorrected?.({ is_noise: true });
    closeDropdown();
    fetch('/api/sentiment/correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId, is_noise: true }),
    }).catch((err) => console.error('Failed to mark noise:', err));
  }, [articleId, isNoise, onCorrected, closeDropdown]);

  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  }, [isOpen, closeDropdown]);

  const dropdown = isOpen ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="p-2 gpu-accel"
      style={{
        position: 'absolute',
        width: '140px',
        top: menuPos.top,
        left: menuPos.left,
        zIndex: 9999,
        background: 'var(--bg)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--card-border)',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'opacity 100ms ease-out, transform 100ms ease-out',
      }}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
        Move to:
      </div>
      {/* Noise option */}
      <button
        onClick={handleMarkNoise}
        role="menuitem"
        className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium transition-colors ${
          isNoise ? 'opacity-50' : 'hover:bg-[var(--border)]'
        }`}
        style={{ color: 'var(--ink)' }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: 'rgba(255,59,48,0.7)' }}
          aria-hidden="true"
        />
        Noise
      </button>
      {/* Separator */}
      <div className="w-full my-1" style={{ borderTop: '1px solid var(--border)' }} />
      {CATEGORIES.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => handleCorrect(cat.slug)}
          role="menuitem"
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
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Edit button */}
      <button
        onClick={toggleDropdown}
        className="p-1.5 sm:p-1 rounded transition-all hover:scale-110 gpu-accel min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        style={{ color: 'var(--muted)', opacity: 0.5 }}
        aria-label="Correct category"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {dropdown}
    </div>
  );
}

export default memo(CategoryCorrection);
