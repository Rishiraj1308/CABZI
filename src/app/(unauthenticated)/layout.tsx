
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirebaseProviderClient, useFirebase } from '@/firebase/client-provider';

function UnauthenticatedLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // Call usePathname unconditionally at the top
  const { user, isUserLoading } = useFirebase();
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    if (isUserLoading) return; // Wait until firebase auth state is known

    if (user) {
        // User is logged in with Firebase, check localStorage for role
        const primarySession = localStorage.getItem('curocity-session');
        if (primarySession) {
            try {
                const { role } = JSON.parse(primarySession);
                if (role === 'admin') router.replace('/admin');
                else router.replace(`/${role}`);
                return;
            } catch (e) {
                console.error("Error parsing session:", e);
                localStorage.removeItem('curocity-session');
            }
        }
        
        // Check other partner sessions if primary is not found or invalid
        const partnerSessionKeys = ['curocity-resq-session', 'curocity-cure-session', 'curocity-ambulance-session', 'curocity-doctor-session'];
        for (const key of partnerSessionKeys) {
            const session = localStorage.getItem(key);
            if (session) {
                try {
                    const { role } = JSON.parse(session);
                    if (role) {
                        router.replace(`/${role}`);
                        return;
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
    
    // If no user or no valid session, show the login page
    setShowChildren(true);
    
  }, [user, isUserLoading, router]);

  if (!showChildren) {
    // Render a full-page loader or null to prevent flash of login page
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
    <FirebaseProviderClient>
      <UnauthenticatedLayoutContent>{children}</UnauthenticatedLayoutContent>
      <Toaster />
    </FirebaseProviderClient>
  );
}
