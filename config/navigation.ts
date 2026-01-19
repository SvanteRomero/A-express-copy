import {
    Building2,
    CreditCard,
    FileText,
    Home,
    Settings,
    Users,
    Wrench,
    ClipboardList,
    Database,
    Activity,
    UserCog,
    Banknote,
    MessageSquare,
    LucideIcon
} from "lucide-react"

export interface NavigationItem {
    title: string
    url: string
    icon: LucideIcon
}

export type UserRole = "Administrator" | "Manager" | "Technician" | "Front Desk" | "Accountant"

export const navigationItems: Record<UserRole, NavigationItem[]> = {
    Administrator: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: Home,
        },
        {
            title: "User Management",
            url: "/dashboard/admin/users",
            icon: Users,
        },
        {
            title: "System Settings",
            url: "/dashboard/admin/settings",
            icon: Settings,
        },
        {
            title: "Database Management",
            url: "/dashboard/admin/database",
            icon: Database,
        },
        {
            title: "System Logs",
            url: "/dashboard/admin/logs",
            icon: Activity,
        },
        {
            title: "Customers",
            url: "/dashboard/customers",
            icon: Building2,
        },
        {
            title: "Tasks",
            url: "/dashboard/front-desk/tasks",
            icon: Wrench,
        },
        {
            title: "Payments",
            url: "/dashboard/payments",
            icon: CreditCard,
        },
        {
            title: "Reports",
            url: "/dashboard/reports",
            icon: FileText,
        }
    ],
    Manager: [
        {
            title: "Dashboard",
            url: "/dashboard/manager",
            icon: Home,
        },
        {
            title: "User Management",
            url: "/dashboard/manager/users",
            icon: UserCog,
        },
        {
            title: "Account Management",
            url: "/dashboard/manager/accounts",
            icon: Banknote,
        },
        {
            title: "Debts",
            url: "/dashboard/debts",
            icon: Banknote,
        },
        {
            title: "Customers",
            url: "/dashboard/customers",
            icon: Building2,
        },
        {
            title: "Tasks",
            url: "/dashboard/manager/tasks",
            icon: Wrench,
        },
        {
            title: "Task History",
            url: "/dashboard/manager/history",
            icon: FileText,
        },
        {
            title: "Bulk Messages",
            url: "/dashboard/messaging",
            icon: MessageSquare,
        },
        {
            title: "Payments",
            url: "/dashboard/payments",
            icon: CreditCard,
        },
        {
            title: "Reports",
            url: "/dashboard/reports",
            icon: FileText,
        }
    ],
    Technician: [
        {
            title: "Dashboard",
            url: "/dashboard/technician",
            icon: Home,
        },
        {
            title: "Tasks",
            url: "/dashboard/technician/tasks",
            icon: ClipboardList,
        },
        {
            title: "History",
            url: "/dashboard/technician/history",
            icon: FileText,
        }
    ],
    "Front Desk": [
        {
            title: "Dashboard",
            url: "/dashboard/front-desk",
            icon: Home,
        },
        {
            title: "Bulk Messages",
            url: "/dashboard/messaging",
            icon: MessageSquare,
        },
        {
            title: "Tasks",
            url: "/dashboard/front-desk/tasks",
            icon: Wrench,
        },
        {
            title: "History",
            url: "/dashboard/front-desk/history",
            icon: FileText,
        }
    ],
    Accountant: [
        {
            title: "Dashboard",
            url: "/dashboard/accountant",
            icon: Home,
        },
        {
            title: "Tasks",
            url: "/dashboard/accountant/tasks",
            icon: Wrench,
        },
        {
            title: "History",
            url: "/dashboard/accountant/history",
            icon: FileText,
        },
        {
            title: "Debts",
            url: "/dashboard/debts",
            icon: Banknote,
        },
        {
            title: "Payments",
            url: "/dashboard/payments",
            icon: CreditCard,
        },
    ]
}
