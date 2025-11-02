
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, RotateCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function MobilePreviewContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get('url') || '/user';
  
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);

  useEffect(() => {
    setPreviewUrl(initialUrl);
    setInputUrl(initialUrl);
  }, [initialUrl]);

  const refreshIframe = () => {
    const iframe = document.getElementById('mobile-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = previewUrl; // Use the state variable
    }
  };
  
  const handleUrlChange = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setPreviewUrl(inputUrl);
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 bg-muted/40 min-h-[80vh]">
        <div className="text-center mb-6 max-w-md w-full">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
                <Smartphone className="w-6 h-6"/>
                Mobile Preview
            </h1>
            <p className="text-muted-foreground">This is a live preview of the application in a mobile frame.</p>
             <form onSubmit={handleUrlChange} className="flex gap-2 items-end mt-4">
                <div className="flex-1 text-left">
                  <Label htmlFor="url-input" className="text-xs">Page URL</Label>
                  <Input 
                      id="url-input"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="/user"
                  />
                </div>
                <Button type="submit">
                    <ArrowRight className="w-4 h-4"/>
                    <span className="sr-only">Go</span>
                </Button>
                <Button onClick={refreshIframe} variant="outline" type="button">
                    <RotateCw className="w-4 h-4"/>
                     <span className="sr-only">Refresh Preview</span>
                </Button>
             </form>
        </div>
      <div 
        className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[10px] rounded-[2.5rem] h-[712px] w-[352px] shadow-xl"
      >
        <div className="w-[148px] h-[14px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
        <div className="h-[40px] w-[3px] bg-gray-800 absolute -left-[13px] top-[124px] rounded-l-lg"></div>
        <div className="h-[40px] w-[3px] bg-gray-800 absolute -left-[13px] top-[178px] rounded-l-lg"></div>
        <div className="h-[52px] w-[3px] bg-gray-800 absolute -right-[13px] top-[142px] rounded-r-lg"></div>
        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-background">
          <iframe
            id="mobile-preview-iframe"
            src={previewUrl}
            className="w-full h-full border-0"
            title="Mobile Preview"
          />
        </div>
      </div>
    </div>
  );
}


export default function MobilePreviewPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-screen" />}>
            <MobilePreviewContent />
        </Suspense>
    )
}
