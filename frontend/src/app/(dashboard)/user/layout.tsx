
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'sonner'
import ClientLayout from './ClientLayout' // Import the new client layout

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  // This layout is now much simpler. It immediately renders the children.
  // The complex client-side logic is moved to ClientLayout.
  return (
    <>
      <ClientLayout>{children}</ClientLayout>
      <Toaster />
    </>
  )
}
