
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from 'next/font/google'
import { LanguageProvider } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import { FirebaseClientProvider } from '@/firebase/client-provider';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});


export const metadata: Metadata = {
  title: 'Cabzi',
  description: 'Fair fares for riders, zero commission for drivers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn('antialiased bg-background text-foreground font-sans', inter.variable)}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <FirebaseClientProvider>
                {children}
                <Toaster />
                <FirebaseErrorListener />
            </FirebaseClientProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
