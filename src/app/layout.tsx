import type { Metadata } from 'next';
import './globals.css';
import BlockPhraseDialogWrapper from '@/components/BlockPhraseDialogWrapper';

export const metadata: Metadata = {
  title: 'Bihar News',
  description: 'Curated Bihar development news — zero-trust pipeline.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <main className="flex-1">
          {children}
        </main>
        <BlockPhraseDialogWrapper />
      </body>
    </html>
  );
}
