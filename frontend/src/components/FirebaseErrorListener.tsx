
'use client';

import React, { useEffect, ReactNode } from 'react';
import { errorEmitter } from '@/lib/error-handling';
import type { FirestorePermissionError } from '@/lib/error-handling';
import { useToast } from '@/hooks/use-toast';
import { CodeBlock } from '@/components/shared/code-block';
import { AlertDescription } from '@/components/ui/alert';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Caught Firestore Permission Error:", error);

      // Present the error in a user-friendly way using a toast.
      toast({
        variant: 'destructive',
        duration: 20000,
        title: "Firestore: Missing or Insufficient Permissions",
        description: (
          <div className="space-y-4 pt-2">
            <AlertDescription>
              The following request was denied by your security rules. Review the details to identify the necessary rule changes.
            </AlertDescription>
            <CodeBlock language="json" className="text-xs max-h-60 overflow-y-auto">
              {JSON.stringify(error.context, null, 2)}
            </CodeBlock>
          </div>
        ) as ReactNode,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything.
}
