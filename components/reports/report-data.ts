import type React from "react"
import {
  DollarSign,
  CreditCard,
  PieChart,
  ClipboardList,
  Clock,
  TrendingUp,
  Users,
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
    title: "Revenue Summary Report",
    description: "Comprehensive summary of revenue by payment methods and channels",
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
    title: "Task Status Report",
    description: "Current number of tasks in each status category",
    icon: ClipboardList,
    href: "/dashboard/reports/task-status",
    badge: "Live Data",
    category: "Operational",
    lastGenerated: "30 minutes ago",
    canGeneratePDF: true,
  },
  {
    id: "task-execution",
    title: "Task Execution Report",
    description: "Task completion timeline analysis",
    icon: Clock,
    href: "/dashboard/reports/task-execution",
    category: "Operational",
    lastGenerated: "2 hours ago",
    canGeneratePDF: true,
  },
]

export const technicianReports: ReportCard[] = [
  {
    id: "performance",
    title: "Technician Performance Report",
    description: "Performance metrics per technician over time periods",
    icon: TrendingUp,
    href: "/dashboard/reports/performance",
    badge: "Trending",
    category: "Performance",
    lastGenerated: "4 hours ago",
    canGeneratePDF: true,
  },
  {
    id: "front-desk-performance",
    title: "Front Desk Performance",
    description: "Percentage of tasks approved and sent out by each front desk staff.",
    icon: Users,
    href: "/dashboard/reports/front-desk-performance",
    category: "Performance",
    lastGenerated: "Never",
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
    name: "Task Report",
    type: "Operational",
    generatedBy: "Shop Manager",
    generatedAt: "2024-01-12 4:20 PM",
    downloadCount: 12,
    size: "203 KB",
  },
]