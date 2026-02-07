'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  className?: string;
  fallbackRoute?: string;
}

export default function BackButton({ 
  label = 'Back', 
  className = '',
  fallbackRoute = '/dashboard'
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Navigate to the fallback route directly for consistent behavior
    router.push(fallbackRoute);
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
