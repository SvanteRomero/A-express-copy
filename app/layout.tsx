'use client'
import type React from "react"
import { useState } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/provider/auth-provider"
import { NotificationProvider } from "@/lib/notification-context"
import { WebSocketProvider } from "@/components/provider/websocket-provider"
import { ThemeProvider } from "@/components/provider/theme-provider"
import { Toaster } from "@/components/ui/feedback/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Create QueryClient once and persist it across rerenders
  // This prevents recreation on every navigation which causes request cancellation
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Increase staleTime to prevent refetches from overwriting optimistic updates
        // during tab switches in production (where network is slower)
        staleTime: 1000 * 30, // 30 seconds (was 10 seconds)
        refetchOnWindowFocus: false,
        refetchOnMount: 'always', // Always check cache first, only refetch if stale
      },
    },
  }))

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <WebSocketProvider>
                  {children}
                  <Toaster />
                </WebSocketProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
