
'use client'

import PartnerDetails from '../partner-details';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function PartnerDetailsPageContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('id');
  const [partnerType, setPartnerType] = useState<'driver' | 'mechanic' | 'cure' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getPartnerType(id: string) {
      if (!db) {
        setIsLoading(false);
        return;
      }

      // Check each collection to find the partner type.
      const collections = ['partners', 'mechanics', 'ambulances'];
      const types: ('driver' | 'mechanic' | 'cure')[] = ['driver', 'mechanic', 'cure'];
      
      for (let i = 0; i < collections.length; i++) {
          try {
            const docRef = doc(db, collections[i], id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setPartnerType(types[i]);
                setIsLoading(false);
                return;
            }
          } catch (error) {
              console.error(`Error checking collection ${collections[i]}:`, error);
          }
      }

      setPartnerType(null); // Partner not found in any collection
      setIsLoading(false);
    }

    if (partnerId) {
      getPartnerType(partnerId);
    } else {
      // If no ID, no need to fetch, just stop loading
      setIsLoading(false);
    }
  }, [partnerId]);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!partnerId) {
    return (
      <div className="text-center">
          <h2 className="text-2xl font-bold">No Partner ID Provided</h2>
          <p className="text-muted-foreground">Please go back and select a partner to view their details.</p>
           <Button asChild variant="outline" className="mt-4">
              <Link href="/admin/partners"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Partners</Link>
          </Button>
      </div>
    );
  }

  return (
    <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/admin/partners"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Partners</Link>
        </Button>
        <PartnerDetails partnerId={partnerId} initialPartnerType={partnerType} />
    </div>
  )
}

export default function PartnerDetailsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PartnerDetailsPageContent />
        </Suspense>
    )
}
