
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page just redirects to /home now. 
// No need for a splash screen logic here anymore.
export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return null;
}
