
'use client'

import { Toaster } from 'sonner'
import BrandLogo from '@/components/shared/brand-logo'
import Link from 'next/link'
import { LanguageToggle, ThemeToggle } from '@/components/shared/toggles'
import { Providers } from '@/app/providers'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="flex min-h-screen items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
          </div>
          {children}
          <Toaster />
      </div>
    </Providers>
  )
}
