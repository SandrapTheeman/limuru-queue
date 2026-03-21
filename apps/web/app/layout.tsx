import type { Metadata } from 'next';
import { Providers } from './providers';
import { VoiceCallProvider } from '@/lib/components/VoiceCallProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Limuru Cottage - Queuing System',
  description: 'Digital queue management system for Limuru Cottage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js" async />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Skip to main content
        </a>
        <Providers>
          <VoiceCallProvider />
          <div className="hospital-bg">
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>
            <div className="bg-orb bg-orb-3"></div>
            <div className="bg-orb bg-orb-4"></div>
            <div className="bg-grid"></div>
          </div>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
