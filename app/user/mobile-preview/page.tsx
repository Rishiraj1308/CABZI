'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, RotateCw } from 'lucide-react';
import Link from 'next/link';

export default function MobilePreviewPage() {
  const refreshIframe = () => {
    const iframe = document.getElementById('mobile-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 bg-muted/40 min-h-[80vh]">
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
                <Smartphone className="w-6 h-6"/>
                Mobile Preview
            </h1>
            <p className="text-muted-foreground">This is a live preview of the main user dashboard.</p>
             <div className="flex gap-2 justify-center mt-4">
                <Button onClick={refreshIframe} variant="outline">
                    <RotateCw className="w-4 h-4 mr-2"/>
                    Refresh Preview
                </Button>
                <Button asChild>
                    <Link href="/user">Back to Dashboard</Link>
                </Button>
             </div>
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
            src="/user"
            className="w-full h-full border-0"
            title="Mobile Preview"
          />
        </div>
      </div>
    </div>
  );
}
