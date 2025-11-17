
'use client';

import React, { useEffect } from 'react';
import { errorEmitter, FirestorePermissionError } from '@/lib/error-handling';
import { toast } from 'sonner';
import { CodeBlock } from '@/components/shared/code-block';
import { AlertDescription } from '@/components/ui/alert';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Caught Firestore Permission Error:", error);

      // Present the error in a user-friendly way using a toast.
      toast.error("Firestore: Missing or Insufficient Permissions", {
        duration: 20000,
        description: (
          <div className="space-y-4 pt-2">
            <AlertDescription>
              The following request was denied by your security rules. Review the details to identify the necessary rule changes.
            </AlertDescription>
            <CodeBlock language="json" className="text-xs max-h-60 overflow-y-auto">
              {JSON.stringify(error.request, null, 2)}
            </CodeBlock>
          </div>
        )
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null; // This component does not render anything.
}
