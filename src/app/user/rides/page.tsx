
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MyActivityPage from '@/app/user/activity/page'

// This page is now a wrapper around the new MyActivityPage
// to maintain the old URL structure while using the new component.
export default function UserRidesPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/user/activity');
    }, [router]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Loading Activity...</h2>
            <p className="text-muted-foreground">Please wait while we fetch your activity history.</p>
        </div>
    );
}
