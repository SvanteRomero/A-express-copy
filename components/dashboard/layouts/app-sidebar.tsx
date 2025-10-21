"use client"
import { useMemo, useCallback } from "react"
import type * as React from "react"
import {
  Building2,
  Calendar,
  ChevronUp,
  CreditCard,
  FileText,
  Home,
  Settings,
  User,
  Users,
  Wrench,
  ClipboardList,
  Database,
  Shield,
  Activity,
  UserCog,
  Banknote,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/feedback/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/layout/sidebar"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

// Navigation items for different roles
const navigationItems = {
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
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
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
      title: "Payments",
      url: "/dashboard/payments",
      icon: CreditCard,
    },
    {
      title: "Reports",
      url: "/dashboard/reports",
      icon: FileText,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
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
      title: "Customers",
      url: "/dashboard/customers",
      icon: Building2,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
  ],
  "Front Desk": [
    {
      title: "Dashboard",
      url: "/dashboard/front-desk",
      icon: Home,
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
        title: "History",
        url: "/dashboard/front-desk/history",
        icon: FileText,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
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
    {
      title: "Reports",
      url: "/dashboard/reports",
      icon: FileText,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()

  const items = useMemo(() => (user ? navigationItems[user.role as keyof typeof navigationItems] : []) || [], [user]);

  const getDashboardUrl = useCallback(() => {
    if (!user) return "/dashboard";
    switch (user.role) {
      case "Administrator":
        return "/dashboard"
      case "Manager":
        return "/dashboard/manager"
      case "Technician":
        return "/dashboard/technician"
      case "Accountant":
        return "/dashboard/accountant"
      case "Front Desk":
        return "/dashboard"
      default:
        return "/dashboard"
    }
  }, [user])

    // Create a full name from first_name and last_name
  const fullName = useMemo(() => {
    if (!user) return "";
    return `${user.first_name} ${user.last_name}`.trim();
  }, [user]);
  
  // Generate initials for avatar fallback
  const getInitials = useCallback(() => {
    if (!user) return "U";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    } else if (user.first_name) {
      return user.first_name[0].toUpperCase()
    } else if (user.username) {
      return user.username[0].toUpperCase()
    }
    return "U"
  }, [user])

  if (!user) return null

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={getDashboardUrl()}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">A+ Express</span>
                  <span className="truncate text-xs">Computer Repair</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="/placeholder-user.jpg" alt={fullName} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{fullName}</span>
                    <span className="truncate text-xs">{user.role}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src="/placeholder-user.jpg" alt={fullName} />
                      <AvatarFallback className="rounded-lg">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                       <span className="truncate font-semibold">{fullName}</span>
                      <span className="truncate text-xs">{user.role}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                      <User />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
