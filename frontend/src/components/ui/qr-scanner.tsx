'use client';

import React from 'react';
import { ScanLine } from 'lucide-react';
// The useQrReader hook has been removed as it was causing dependency issues.
// A placeholder UI is shown instead.

interface QrScannerProps {
  onResult: (result: any, error: any) => void;
}

const QrScanner = ({ onResult }: QrScannerProps) => {
  // In a real application, you would use a modern, well-maintained QR scanner library here.
  // For this prototype, we are just showing a placeholder.
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-muted/50 text-muted-foreground">
        <ScanLine className="w-16 h-16 mb-4"/>
        <p className="font-semibold">QR Scanner Unavailable</p>
        <p className="text-xs text-center">The QR scanning library is temporarily disabled due to compatibility issues.</p>
    </div>
  );
};

export default QrScanner;
