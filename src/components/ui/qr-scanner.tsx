'use client';

import React from 'react';
import { ScanLine } from 'lucide-react';

interface QrScannerProps {
  onResult: (result: any, error: any) => void;
  videoRef?: React.RefObject<HTMLVideoElement>; // Make ref optional as we are not using it
}

/**
 * This is a placeholder component for the QR Scanner.
 * The original dependency was causing build issues and has been removed.
 * To implement QR scanning, a new library like 'html5-qrcode' can be integrated here.
 */
const QrScanner = ({ onResult, videoRef }: QrScannerProps) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-muted/50 text-muted-foreground">
        <ScanLine className="w-16 h-16 mb-4"/>
        <p className="font-semibold">QR Scanner Unavailable</p>
        <p className="text-xs text-center">The QR scanning library has been temporarily disabled to resolve a build issue.</p>
    </div>
  );
};

export default QrScanner;
