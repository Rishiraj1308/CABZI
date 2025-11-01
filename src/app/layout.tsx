import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { Suspense } from "react";
import { NewLogoIcon } from "@/components/brand-logo";
import { motion, AnimatePresence } from 'framer-motion';


const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontPoppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Curocity - Your Partner on the Road",
  description:
    "A fair, transparent, and safe ride-hailing and emergency response platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontPoppins.variable
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
