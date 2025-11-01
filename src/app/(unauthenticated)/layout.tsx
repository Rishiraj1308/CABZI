'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '@/firebase/client-provider';

// This layout now checks for a single, unified session and redirects if found.
function UnauthenticatedLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useFirebase();
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      // Still loading, wait...
      return;
    }

    if (user) {
        // User is logged in with Firebase, redirect based on stored session role
        const sessionKeys = [
            'curocity-session',
            'curocity-resq-session',
            'curocity-cure-session',
            'curocity-ambulance-session',
            'curocity-doctor-session'
        ];

        for (const key of sessionKeys) {
            const session = localStorage.getItem(key);
            if (session) {
                try {
                    const { role } = JSON.parse(session);
                    if (role) {
                        const path = role === 'user' ? '/user' : `/${role}`;
                        router.replace(path);
                        return; // Exit after successful redirect
                    }
                } catch (e) {
                    // Invalid session data, remove it and continue checking
                    localStorage.removeItem(key);
                }
            }
        }
      
        // If Firebase user exists but no valid session role, default to user dashboard
        // This is a safe fallback.
        router.replace('/user');
        return;

    } else {
        // No user is logged in, it's safe to show the children (login page, etc.)
        setShowChildren(true);
    }

  }, [user, isUserLoading, router]);
  
  // Prevent flash of login page while auth state is being determined
  if (!showChildren) {
    return null; 
  }

  return (
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
  );
}

export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UnauthenticatedLayoutContent>{children}</UnauthenticatedLayoutContent>
      <Toaster />
    </>
  )
}
