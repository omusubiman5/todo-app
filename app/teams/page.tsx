"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const TeamList = dynamic(() => import('@/components/TeamList'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">チーム一覧を読み込み中...</p>
      </div>
    </div>
  ),
  ssr: false
});

export default function TeamsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">チーム一覧を読み込み中...</p>
        </div>
      </div>
    }>
      <TeamList />
    </Suspense>
  );
} 