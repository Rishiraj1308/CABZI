
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
      // User is logged in with Firebase, now check localStorage for role hints
      // This helps redirect faster on subsequent visits.
      const primarySession = localStorage.getItem('curocity-session');
      if (primarySession) {
          try {
              const { role } = JSON.parse(primarySession);
              if (role) {
                   if (role === 'admin') router.replace('/admin');
                   else router.replace(`/${role}`);
                   return; // Exit early
              }
          } catch (e) {
              // Invalid session data, remove it
              localStorage.removeItem('curocity-session');
          }
      }
      
      // Check other specific partner sessions if primary is not found
      const partnerSessionKeys = ['curocity-resq-session', 'curocity-cure-session', 'curocity-ambulance-session', 'curocity-doctor-session'];
      for (const key of partnerSessionKeys) {
          const session = localStorage.getItem(key);
          if (session) {
              try {
                  const { role } = JSON.parse(session);
                  if (role) {
                      router.replace(`/${role}`);
                      return; // Exit early
                  }
              } catch (e) {
                  localStorage.removeItem(key);
              }
          }
      }

      // If firebase user exists but no session role, default to user dashboard
      // This can happen on first login via Google/Phone before session is fully set
      router.replace('/user');
      return;

    } else {
        // No user is logged in, okay to show the children (login page)
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
