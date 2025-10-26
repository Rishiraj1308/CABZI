
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page has been deprecated. All doctor management functionality has been
// moved into the unified `/cure` dashboard page as a tab.
// This component now just redirects to the correct place.

export default function DeprecatedDoctorsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/cure');
    }, [router]);

    return (
        <div className="flex h-full w-full items-center justify-center">
            <p>Redirecting to the main CURE dashboard...</p>
        </div>
    );
}

    