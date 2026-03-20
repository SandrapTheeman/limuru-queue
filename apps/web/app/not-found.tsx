'use client';

import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
          <FileQuestion className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-5xl font-bold text-white mb-4">404</h1>
        
        <h2 className="text-lg font-medium text-white/90 mb-2">
          Page Not Found
        </h2>
        
        <p className="text-white/60 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
