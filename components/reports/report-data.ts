import type React from "react"
import {
  DollarSign,
  CreditCard,
  PieChart,
  ClipboardList,
  Clock,
  TrendingUp,
} from "lucide-react"

// Types
export interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
  category: string
  lastGenerated?: string
  canGeneratePDF: boolean
}

export interface RecentReport {
  id: string
  name: string
  type: string
  generatedBy: string
  generatedAt: string
  downloadCount: number
  size: string
}

export interface SelectedReport {
  id: string
  data: any
  currentPage?: number
  pageSize?: number
}

// Data
export const financialReports: ReportCard[] = [
  {
    id: "revenue-summary",
    title: "Revenue Summary",
    description: "View daily, weekly, monthly income trends and patterns",
    icon: DollarSign,
    href: "/dashboard/reports/revenue",
    badge: "Popular",
    category: "Financial",
    lastGenerated: "2 hours ago",
    canGeneratePDF: true,
  },
  {
    id: "outstanding-payments",
    title: "Outstanding Payments",
    description: "List of unpaid or partially paid tasks requiring follow-up",
    icon: CreditCard,
    href: "/dashboard/reports/payments",
    category: "Financial",
    lastGenerated: "1 day ago",
    canGeneratePDF: true,
  },
  {
    id: "payment-methods",
    title: "Payment Method Breakdown",
    description: "Analyze payments by cash, card, and digital methods",
    icon: PieChart,
    href: "/dashboard/reports/payment-methods",
    category: "Financial",
    lastGenerated: "3 days ago",
    canGeneratePDF: true,
  },
]

export const operationalReports: ReportCard[] = [
  {
    id: "task-status",
    title: "Tasks by Status Overview",
    description: "Current number of tasks in each status category",
    icon: ClipboardList,
    href: "/dashboard/reports/task-status",
    badge: "Live Data",
    category: "Operational",
    lastGenerated: "30 minutes ago",
    canGeneratePDF: true,
  },
  {
    id: "turnaround-time",
    title: "Average Turnaround Time",
    description: "Measure repair efficiency and identify bottlenecks",
    icon: Clock,
    href: "/dashboard/reports/turnaround",
    category: "Operational",
    lastGenerated: "2 hours ago",
    canGeneratePDF: true,
  },
]

export const technicianReports: ReportCard[] = [
  {
    id: "performance",
    title: "Completed Tasks by Technician",
    description: "Performance metrics per technician over time periods",
    icon: TrendingUp,
    href: "/dashboard/reports/performance",
    badge: "Trending",
    category: "Performance",
    lastGenerated: "4 hours ago",
    canGeneratePDF: true,
  },
]

export const recentReports: RecentReport[] = [
  {
    id: "RPT-001",
    name: "Monthly Revenue Summary - January 2024",
    type: "Financial",
    generatedBy: "Admin User",
    generatedAt: "2024-01-15 10:30 AM",
    downloadCount: 5,
    size: "245 KB",
  },
  {
    id: "RPT-002",
    name: "Technician Performance Report",
    type: "Performance",
    generatedBy: "Shop Manager",
    generatedAt: "2024-01-14 2:15 PM",
    downloadCount: 3,
    size: "189 KB",
  },
  {
    id: "RPT-003",
    name: "Outstanding Payments Report",
    type: "Financial",
    generatedBy: "Admin User",
    generatedAt: "2024-01-13 9:45 AM",
    downloadCount: 8,
    size: "156 KB",
  },
  {
    id: "RPT-004",
    name: "Tasks by Status Overview",
    type: "Operational",
    generatedBy: "Shop Manager",
    generatedAt: "2024-01-12 4:20 PM",
    downloadCount: 12,
    size: "203 KB",
  },
]