
'use client';

import { Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PartnerDetails from '@/app/(dashboard)/admin/partners/partner-details';

function PartnerDetailsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const partnerId = params.partnerId as string;
  const partnerType = searchParams.get('type') as 'driver' | 'mechanic' | 'cure' | 'doctor' | null;
  const hospitalId = searchParams.get('hospitalId') as string | null;

  if (!partnerId || !partnerType) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold">Invalid Partner Link</h2>
            <p className="text-muted-foreground">The partner ID or type is missing from the URL.</p>
            <Button asChild variant="outline" className="mt-4">
               <Link href="/admin/partners"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Partners</Link>
           </Button>
        </div>
    );
  }
  
  if (partnerType === 'doctor' && !hospitalId) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold">Missing Hospital Information</h2>
            <p className="text-muted-foreground">The hospital ID is required to view doctor details.</p>
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
          <PartnerDetails partnerId={partnerId} initialPartnerType={partnerType} hospitalId={hospitalId}/>
      </div>
  );
}


export default function PartnerDetailsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <PartnerDetailsPageContent />
        </Suspense>
    )
}
