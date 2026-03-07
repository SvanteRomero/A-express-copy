"use client"

import type React from "react"

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}
