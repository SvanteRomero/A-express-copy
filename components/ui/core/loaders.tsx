'use client'

import { Loader2 } from "lucide-react"
import { Skeleton } from "./skeleton"
import { cn } from "@/lib/utils"

interface SpinnerProps {
    className?: string
    size?: "sm" | "md" | "lg"
}

/**
 * Inline spinner for buttons and small loading indicators
 */
export function Spinner({ className, size = "md" }: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-8 w-8"
    }
    return <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
}

interface TableSkeletonProps {
    rows?: number
    columns?: number
    className?: string
}

/**
 * Skeleton for table content
 */
export function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex gap-4 p-4 border-b">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 px-4 py-3">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    )
}

interface ListSkeletonProps {
    items?: number
    className?: string
}

/**
 * Skeleton for mobile card lists
 */
export function ListSkeleton({ items = 3, className }: ListSkeletonProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                </div>
            ))}
        </div>
    )
}

interface CardGridSkeletonProps {
    cards?: number
    columns?: number
    className?: string
}

/**
 * Skeleton for dashboard stat card grids
 */
export function CardGridSkeleton({ cards = 3, columns = 3, className }: CardGridSkeletonProps) {
    return (
        <div className={cn(`grid gap-4 md:grid-cols-${columns}`, className)}>
            {Array.from({ length: cards }).map((_, i) => (
                <div key={i} className="rounded-lg border p-6 space-y-3">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                    </div>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-40" />
                </div>
            ))}
        </div>
    )
}

interface PageSkeletonProps {
    children?: React.ReactNode
    className?: string
}

/**
 * Full page loading wrapper with centered spinner
 */
export function PageSkeleton({ children, className }: PageSkeletonProps) {
    return (
        <div className={cn("flex-1 space-y-6 p-6", className)}>
            {children || (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" className="text-muted-foreground" />
                </div>
            )}
        </div>
    )
}

/**
 * Dashboard-specific loading skeleton
 */
export function DashboardSkeleton() {
    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
            {/* Stats cards skeleton */}
            <CardGridSkeleton cards={3} />
            {/* Action cards skeleton */}
            <CardGridSkeleton cards={3} />
        </div>
    )
}

/**
 * Task list specific skeleton
 */
export function TaskListSkeleton() {
    return (
        <div className="rounded-lg border bg-card">
            <div className="p-6 space-y-2 border-b">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="p-6 space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-6 space-y-4">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                        </div>
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <div className="flex gap-4">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
