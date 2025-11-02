
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

function MobilePreviewContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get('url') || '/user';
  
  const [previewUrl, setPreviewUrl] = useState(initialUrl);

  useEffect(() => {
    setPreviewUrl(initialUrl);
  }, [initialUrl]);

  return (
    <div className="w-screen h-screen bg-background">
        <iframe
            id="mobile-preview-iframe"
            src={previewUrl}
            className="w-full h-full border-0"
            title="Mobile Preview"
        />
    </div>
  );
}


export default function MobilePreviewPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-screen" />}>
            <MobilePreviewContent />
        </Suspense>
    )
}
