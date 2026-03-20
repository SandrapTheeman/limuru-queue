'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        
        <h1 className="text-5xl font-bold text-white mb-4">500</h1>
        
        <h2 className="text-lg font-medium text-white/90 mb-2">
          Something went wrong
        </h2>
        
        <p className="text-white/60 mb-6">
          {error.message || 'An unexpected error occurred on our end.'}
        </p>
        
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="mt-4 text-xs text-white/40 font-mono">
            Error digest: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
