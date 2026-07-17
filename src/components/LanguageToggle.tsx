'use client';

import { useState } from 'react';

type Language = 'all' | 'en' | 'hi';

interface Props {
  onChange: (lang: Language) => void;
  current: Language;
}

export default function LanguageToggle({ onChange, current }: Props) {
  const options: { value: Language; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी' },
  ];

  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            current === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
