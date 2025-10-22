
import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/hooks/use-language'
import { FirebaseProviderClient } from '@/firebase/client-provider'
import { ClientSessionProvider } from '@/components/client-session-provider'

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontPoppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
})


export const metadata: Metadata = {
  title: 'Cabzi - Your Partner on the Road',
  description: 'A fair, transparent, and safe ride-hailing and emergency response platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable,
        fontPoppins.variable
      )}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <LanguageProvider>
              <FirebaseProviderClient>
                <ClientSessionProvider>
                  {children}
                </ClientSessionProvider>
              </FirebaseProviderClient>
            </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
