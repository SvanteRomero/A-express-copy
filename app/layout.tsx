'use client'
import type React from "react"
import { useState } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/provider/auth-provider"
import { NotificationProvider } from "@/lib/notification-context"
import { WebSocketProvider } from "@/lib/websocket-context"
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
        // Reduce unnecessary refetches during navigation
        staleTime: 1000 * 10, // 10 seconds
        refetchOnWindowFocus: false,
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
