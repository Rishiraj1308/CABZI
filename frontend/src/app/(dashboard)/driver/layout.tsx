
'use client'

import React from 'react';
import { NotificationsProvider } from '@/context/NotificationContext';
import { DriverProvider } from '@/context/DriverContext'; // Import DriverProvider
import ClientLayout from './ClientLayout';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotificationsProvider>
            <DriverProvider> {/* Wrap with DriverProvider */}
                <ClientLayout>{children}</ClientLayout>
            </DriverProvider>
        </NotificationsProvider>
    );
}
