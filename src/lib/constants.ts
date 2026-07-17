import type { Category } from '@/scraper/config';

export const CATEGORIES: { slug: Category; label: string; color: string }[] = [
  { slug: 'economy', label: 'Economy', color: '#2563eb' },
  { slug: 'infrastructure', label: 'Infrastructure', color: '#dc2626' },
  { slug: 'industry', label: 'Industry', color: '#7c3aed' },
  { slug: 'agriculture', label: 'Agriculture', color: '#16a34a' },
  { slug: 'education', label: 'Education', color: '#ea580c' },
  { slug: 'healthcare', label: 'Healthcare', color: '#0891b2' },
  { slug: 'environment', label: 'Environment', color: '#65a30d' },
];

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
