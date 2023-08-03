import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ModalProvider } from '@/components/model-provider'
import ToasterProvider from '@/components/toaster-provider'
import { CrispProvider } from '@/components/crisp-provider'
import GoogleAnalytics from '@/components/google-analytics'
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChadChapters',
  description: 'Quick and easy AI chaptering for your videos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
      <GoogleAnalytics GA_MEASUREMENT_ID={process.env.GA_MEASUREMENT_ID!}/>
        <CrispProvider />
        <body className={inter.className}>
          <ModalProvider />
          <ToasterProvider />
          {children}
          <Analytics />
          </body>
      </html>
    </ClerkProvider>
  )
}
