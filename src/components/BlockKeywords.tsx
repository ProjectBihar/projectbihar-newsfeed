'use client';

import { useState } from 'react';

interface BlockKeywordsProps {
  onBlock?: (phrase: string) => void;
}

export default function BlockKeywords({ onBlock }: BlockKeywordsProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onBlock) {
      onBlock(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Block keywords or phrases — e.g. "Chennai", "UPSC exam"'
        className="block-input"
      />
    </form>
  );
}
