'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';

export default function AdminRootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
    } else {
      router.push('/dashboard/admin');
    }
  }, [isAuthenticated, user, router]);

  return null;
}
