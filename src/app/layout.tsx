import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Curocity: The CPR Ecosystem',
  description:
    'A full-stack, multi-tenant web application that re-imagines urban mobility by integrating a fair, 0% commission ride-hailing service with a life-saving emergency response network.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('bg-background text-foreground font-sans', inter.variable, poppins.variable)}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
