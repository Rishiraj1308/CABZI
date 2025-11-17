
      'use client'
      
      import { type ReactNode, useState, useEffect } from 'react'
      import Link from 'next/link'
      import { useRouter } from 'next/navigation'
      
      import { Button } from '@/components/ui/button'
      import AdminNav, { AdminMobileNav } from './components/admin-nav'
      import { PanelLeft } from 'lucide-react'
      import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
      import BrandLogo from '@/components/shared/brand-logo'
      import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
      import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
      import { ThemeToggle } from './components/theme-toggle'
      import { LogoutButton } from './components/logout-button'
      import { Skeleton } from '@/components/ui/skeleton'
      
      // Triggering a new Vercel build
      interface AdminSession {
        name: string;
        adminRole: string;
      }
