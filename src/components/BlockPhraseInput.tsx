'use client';

import { useState, useEffect, useCallback } from 'react';

interface BlockedPhrase {
  id: string;
  phrase: string;
  blocked_at: string;
}

interface Props {
  onBlocked?: (phrase: string) => void;
  onUnblocked?: (phrase: string) => void;
}

export default function BlockPhraseInput({ onBlocked, onUnblocked }: Props) {
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedPhrases, setBlockedPhrases] = useState<BlockedPhrase[]>([]);
  const [showList, setShowList] = useState(false);

  const fetchBlocked = useCallback(async () => {
    try {
      const res = await fetch('/api/block');
      const data = await res.json();
      setBlockedPhrases(data.phrases || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleBlock = useCallback(async () => {
    if (!phrase.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: phrase.trim() }),
      });
      if (res.ok) {
        const newPhrase = phrase.trim();
        setPhrase('');
        onBlocked?.(newPhrase);
        fetchBlocked();
      }
    } catch {}
    setLoading(false);
  }, [phrase, loading, onBlocked, fetchBlocked]);

  const handleUnblock = useCallback(async (id: string, phraseText: string) => {
    try {
      await fetch('/api/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      onUnblocked?.(phraseText);
      fetchBlocked();
    } catch {}
  }, [onUnblocked, fetchBlocked]);

  return (
    <div className="w-full">
      {/* Input */}
      <div className="glass-input flex items-center overflow-hidden">
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBlock()}
          placeholder='Block keywords or phrases — e.g. "Chennai", "UPSC exam"'
          className="flex-1 px-4 py-2.5 text-[13px] outline-none bg-transparent"
          style={{ color: 'var(--ink)' }}
        />
        {blockedPhrases.length > 0 && (
          <button
            onClick={() => setShowList(!showList)}
            className="px-3 py-2.5 text-[11px] font-medium transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            {blockedPhrases.length} blocked
          </button>
        )}
        {phrase.trim() && (
          <button
            onClick={handleBlock}
            disabled={loading}
            className="px-4 py-2.5 text-[12px] font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            {loading ? '...' : 'Block'}
          </button>
        )}
      </div>

      {/* Blocked phrases list */}
      {showList && blockedPhrases.length > 0 && (
        <div className="mt-2 glass-card p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Blocked Phrases
            </span>
            <button
              onClick={() => setShowList(false)}
              className="text-[11px] hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Hide
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {blockedPhrases.map((bp) => (
              <span
                key={bp.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium"
                style={{ backgroundColor: 'var(--border)', color: 'var(--ink-secondary)' }}
              >
                {bp.phrase}
                <button
                  onClick={() => handleUnblock(bp.id, bp.phrase)}
                  className="ml-0.5 hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
