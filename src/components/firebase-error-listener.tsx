
'use client'

import React, { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-handling';
import { type FirestorePermissionError } from '@/lib/error-handling';
import { useToast } from '@/hooks/use-toast';
import { CodeBlock } from './code-block';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Caught Firestore Permission Error:", error);

      // Present the error in a user-friendly way using a toast.
      toast({
        variant: 'destructive',
        duration: 20000,
        title: (
            <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Firestore: Missing or Insufficient Permissions
            </div>
        ),
        description: (
          <div className="space-y-4 pt-2">
            <AlertDescription>
              The following request was denied by your security rules. Review the details to identify the necessary rule changes.
            </AlertDescription>
            <CodeBlock language="json" className="text-xs max-h-60 overflow-y-auto">
              {JSON.stringify(error.context, null, 2)}
            </CodeBlock>
          </div>
        ),
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything.
}
