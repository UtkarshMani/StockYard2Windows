'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't check auth until component is mounted (client-side only)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardContent>{children}</DashboardContent>;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Check localStorage directly as fallback
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
    
    if (!isAuthenticated && !hasToken) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Check localStorage directly
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  
  if (!isAuthenticated && !hasToken) {
    return null;
  }

  return <>{children}</>;
}
