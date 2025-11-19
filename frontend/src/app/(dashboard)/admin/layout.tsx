
'use client'
import React from 'react'
import AdminClientLayout from './ClientLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // This is now a simple server-side wrapper.
  // The client-side logic is handled in AdminClientLayout.
  return <AdminClientLayout>{children}</AdminClientLayout>
}
