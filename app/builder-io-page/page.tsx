'use client';

import React, { useState, useEffect } from 'react';
import { builder, BuilderComponent } from '@builder.io/react';
import { Skeleton } from '@/components/ui/skeleton';

// IMPORTANT: Replace with your actual public API key from Builder.io
const BUILDER_API_KEY = process.env.NEXT_PUBLIC_BUILDER_IO_API_KEY || '408472aa4411443ebecd8ae63561e97f';
builder.init(BUILDER_API_KEY);

export default function BuilderIoPage() {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const fetchedContent = await builder.get('page', {
          // Fetch content targeting the current page's URL path
          userAttributes: {
            urlPath: '/builder-io-page',
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
