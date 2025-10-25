
'use client'

import React, { useState, useEffect } from 'react'
import MyActivityPage from '@/app/user/activity/page'

// This page is now a wrapper around the new MyActivityPage
// to maintain the old URL structure while using the new component.
export default function UserAppointmentsPage() {

    return (
        <div className="p-4 md:p-6">
             <MyActivityPage />
        </div>
    );
}
