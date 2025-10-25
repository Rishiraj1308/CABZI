'use client'

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import VideoCall from '@/components/video-call';

export default function VideoCallPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-screen" />}>
            <VideoCall />
        </Suspense>
    )
}
