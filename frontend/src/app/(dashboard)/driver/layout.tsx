
'use client'

import React from 'react';
import { NotificationsProvider } from '@/context/NotificationContext';
import ClientLayout from './ClientLayout'; // Import the new client layout

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    // This layout is now simplified to just provide the children and providers.
    // The complex client-side logic is moved to ClientLayout.
    return (
        <NotificationsProvider>
            <ClientLayout>{children}</ClientLayout>
        </NotificationsProvider>
    );
}
