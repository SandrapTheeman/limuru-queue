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
        <Providers>
          <VoiceCallProvider />
          <div className="hospital-bg">
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>
            <div className="bg-orb bg-orb-3"></div>
            <div className="bg-orb bg-orb-4"></div>
            <div className="bg-grid"></div>
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
