'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page is now a simple redirect to the unified activity page.
export default function UserAppointmentsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/user/activity');
    }, [router]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Loading Appointments...</h2>
            <p className="text-muted-foreground">Please wait while we fetch your appointment history.</p>
        </div>
    );
}
