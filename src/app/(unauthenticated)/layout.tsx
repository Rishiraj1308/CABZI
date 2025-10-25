
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirebaseProviderClient } from '@/firebase/client-provider';

// This layout now checks for a single, unified session and redirects if found.
export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    // This effect runs only once on the client side after the component mounts.
    const primarySession = localStorage.getItem('curocity-session');
    let redirected = false;

    if (primarySession) {
        try {
            const { role } = JSON.parse(primarySession);
            if (role) {
                 if (role === 'admin') router.replace('/admin');
                 else router.replace(`/${role}`);
                 redirected = true;
            }
        } catch (e) {
            localStorage.removeItem('curocity-session');
        }
    }
    
    if (!redirected) {
        const partnerSessionKeys = ['curocity-resq-session', 'curocity-cure-session', 'curocity-ambulance-session', 'curocity-doctor-session'];
        for (const key of partnerSessionKeys) {
            const session = localStorage.getItem(key);
            if (session) {
                try {
                    const { role } = JSON.parse(session);
                    if (role) {
                        router.replace(`/${role}`);
                        redirected = true;
                        break; 
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
    
    // If no valid session is found and no redirection happened, show the page content.
    if (!redirected) {
        setShowChildren(true);
    }
  // By removing `router` from the dependency array, we ensure this logic runs only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  if (!showChildren) {
    return null; // Render nothing until redirection logic completes.
  }

  return (
    <FirebaseProviderClient>
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
      <Toaster />
    </FirebaseProviderClient>
  );
}
