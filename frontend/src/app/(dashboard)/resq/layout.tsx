'use client'

import React from 'react'
import { Toaster } from "@/components/ui/toaster";

// This layout is now simplified to just provide the children and a toaster.
// The main header and navigation are handled by the parent /user/layout.tsx
export default function ResQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
