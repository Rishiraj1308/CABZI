
'use client';

import React, { useState, useEffect } from 'react';
import { builder, BuilderComponent } from '@builder.io/react';
import { Skeleton } from '@/components/ui/skeleton';

// Initialize the Builder.io client with your public API key
// This key is safely stored in your .env file
const BUILDER_API_KEY = process.env.NEXT_PUBLIC_BUILDER_IO_API_KEY || '';
if (BUILDER_API_KEY) {
  builder.init(BUILDER_API_KEY);
} else {
  console.error("Builder.io API Key is missing. Please add NEXT_PUBLIC_BUILDER_IO_API_KEY to your .env file.");
}

export default function BuilderIoPage() {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run this if the API key is available
    if (!BUILDER_API_KEY) {
      setIsLoading(false);
      return;
    }

    async function fetchContent() {
      try {
        // Fetch content from Builder.io that matches the current URL path
        const fetchedContent = await builder.get('page', {
          userAttributes: {
            urlPath: window.location.pathname,
          },
        }).promise();

        setContent(fetchedContent || null);
      } catch (error) {
        console.error("Failed to fetch Builder.io content:", error);
        setContent(null); // Set to null on error to show the "not found" message
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, []);

  if (!BUILDER_API_KEY) {
      return (
          <div className="container py-8 text-center">
             <h2 className="text-2xl font-semibold text-destructive">Builder.io API Key is Missing</h2>
             <p className="mt-2 text-muted-foreground">Please make sure your `NEXT_PUBLIC_BUILDER_IO_API_KEY` is set in the `.env` file.</p>
          </div>
      )
  }

  return (
    <div className="container py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold">Builder.io Integration Example</h1>
        <p className="text-muted-foreground mt-2">
          This page fetches and renders content directly from your Builder.io space.
        </p>
      </header>

      <main className="p-6 border-2 border-dashed rounded-lg min-h-[50vh]">
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-32 w-full" />
            </div>
        ) : content ? (
          // If content is found, render it using the BuilderComponent
          <BuilderComponent model="page" content={content} />
        ) : (
          // If no content is found, show instructions
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">Content Not Found</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              To see this page work, go to your Builder.io space, create a new page, and set its URL path to: <code className="bg-muted p-1 rounded font-mono text-sm">/builder-io-page</code>. Then publish it and refresh this page.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
