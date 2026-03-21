'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '../../lib/ui';

export default function AdminRootPage() {
  const router = useRouter();
  const { mounted, isAuthenticated, user } = useAuthGuard();

  useEffect(() => {
    if (mounted && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      router.push('/dashboard/admin');
    }
  }, [mounted, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white">Loading...</span>
        </div>
      </div>
    </div>
  );
}
