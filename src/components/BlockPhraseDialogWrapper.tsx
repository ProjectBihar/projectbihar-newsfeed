'use client';

import dynamic from 'next/dynamic';

const BlockPhraseDialog = dynamic(
  () => import('./BlockPhraseDialog'),
  { ssr: false }
);

export default function BlockPhraseDialogWrapper() {
  return <BlockPhraseDialog />;
}
