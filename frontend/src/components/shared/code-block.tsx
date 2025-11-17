'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  children: React.ReactNode;
  language?: string;
  className?: string;
}

export function CodeBlock({ children, language, className }: CodeBlockProps) {
  const ref = React.useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    if (ref.current?.textContent) {
      navigator.clipboard.writeText(ref.current.textContent);
      toast.success('Copied to clipboard!');
    }
  };

  return (
    <div className="relative group">
      <pre
        ref={ref}
        className={`bg-muted/50 p-3 rounded-md text-xs font-mono overflow-x-auto ${className}`}
      >
        <code className={`language-${language}`}>{children}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
