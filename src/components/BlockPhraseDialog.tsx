'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';

interface BlockedPhrase {
  id: string;
  phrase: string;
  blocked_at: string;
}

export default function BlockPhraseDialog() {
  const [open, setOpen] = useState(false);
  const [phrases, setPhrases] = useState<BlockedPhrase[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const loadPhrases = useCallback(async () => {
    const { data } = await supabase
      .from('blocked_phrases')
      .select('*')
      .order('blocked_at', { ascending: false });
    if (data) setPhrases(data);
  }, [supabase]);

  useEffect(() => {
    const dialog = document.getElementById('block-dialog') as HTMLDialogElement;
    if (!dialog) return;

    const observer = new MutationObserver(() => {
      if (dialog.open) {
        setOpen(true);
        loadPhrases();
      } else {
        setOpen(false);
      }
    });

    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, [loadPhrases]);

  const addPhrase = async () => {
    const phrase = input.trim();
    if (!phrase) return;
    setLoading(true);

    const { error } = await supabase
      .from('blocked_phrases')
      .insert({ phrase });

    if (!error) {
      setInput('');
      await loadPhrases();
    }
    setLoading(false);
  };

  const removePhrase = async (id: string) => {
    await supabase.from('blocked_phrases').delete().eq('id', id);
    await loadPhrases();
  };

  return (
    <dialog
      id="block-dialog"
      className="backdrop:bg-black/40 rounded-xl shadow-2xl border border-gray-200 w-full max-w-md"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Blocked Phrases
          </h2>
          <button
            onClick={() => {
              const dialog = document.getElementById('block-dialog') as HTMLDialogElement;
              dialog?.close();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Headlines containing these phrases will be hidden from your feed.
        </p>

        {/* Add phrase */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
            placeholder="Type a word or phrase to block..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addPhrase}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Block
          </button>
        </div>

        {/* Blocked phrases list */}
        <div className="max-h-60 overflow-y-auto">
          {phrases.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No blocked phrases yet
            </p>
          ) : (
            <ul className="space-y-2">
              {phrases.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-gray-700 font-medium">
                    {p.phrase}
                  </span>
                  <button
                    onClick={() => removePhrase(p.id)}
                    className="text-gray-400 hover:text-red-600 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
