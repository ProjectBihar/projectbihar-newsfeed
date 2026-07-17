export type Category =
  | 'economy'
  | 'infrastructure'
  | 'industry'
  | 'agriculture'
  | 'education'
  | 'healthcare'
  | 'environment'
  | 'exclude';

export const ALL_CATEGORIES: Category[] = [
  'economy',
  'infrastructure',
  'industry',
  'agriculture',
  'education',
  'healthcare',
  'environment',
];

export const CATEGORY_DISPLAY: Record<Category, string> = {
  economy: 'Economy',
  infrastructure: 'Infrastructure',
  industry: 'Industry',
  agriculture: 'Agriculture',
  education: 'Education',
  healthcare: 'Healthcare',
  environment: 'Environment',
  exclude: 'Exclude',
};

export const FETCH_TIMEOUT_MS = 15_000;
export const DELAY_BETWEEN_REQUESTS_MS = 800;
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
