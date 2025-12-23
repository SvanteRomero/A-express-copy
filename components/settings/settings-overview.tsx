"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import {
  Settings,
  Shield,
  Users,
  Bell,
  Database,
  FileText,
  CreditCard,
  Laptop,
  MapPin,
  Clock,
  Lock,
  Activity,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/feedback/dialog";
import ManagePaymentMethodsDialog from "../financials/payments/manage-payment-methods-dialog";
import ManagePaymentCategoriesDialog from "../financials/payments/manage-payment-categories-dialog";
import { Plus } from "lucide-react";
import { useState } from "react";

interface SettingCard {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
  adminOnly?: boolean
  managerAccess?: boolean
}

const settingsCategories: SettingCard[] = [
  {
    id: "audit-log",
    title: "System Audit Log",
    description: "View comprehensive system activity logs and security events",
    icon: Shield,
    href: "/dashboard/settings/audit-log",
    badge: "Admin Only",
    adminOnly: true,
  },
  {
    id: "user-management",
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    icon: Users,
    href: "/dashboard/settings/users",
    adminOnly: true,
    managerAccess: true,
  },
  {
    id: "notifications",
    title: "Notification Settings",
    description: "Configure email alerts, SMS notifications, and system alerts",
    icon: Bell,
    href: "/dashboard/settings/notifications",
    managerAccess: true,
  },
  {
    id: "backup",
    title: "Backup & Recovery",
    description: "Manage data backups and system recovery options",
    icon: Database,
    href: "/dashboard/settings/backup",
    adminOnly: true,
  },
  {
    id: "reports",
    title: "Report Configuration",
    description: "Customize report templates and automated report generation",
    icon: FileText,
    href: "/dashboard/settings/reports",
    managerAccess: true,
  },
  {
    id: "payment",
    title: "Payment Settings",
    description: "Configure payment methods, tax rates, and pricing",
    icon: CreditCard,
    href: "/dashboard/settings/payment",
    adminOnly: true,
    managerAccess: true,
  },
  {
    id: "inventory",
    title: "Inventory Management",
    description: "Manage parts inventory, suppliers, and stock levels",
    icon: Laptop,
    href: "/dashboard/settings/inventory",
    managerAccess: true,
  },
  {
    id: "locations",
    title: "Shop Locations",
    description: "Configure physical locations and storage areas",
    icon: MapPin,
    href: "/dashboard/settings/locations",
    managerAccess: true,
  },
  {
    id: "business-hours",
    title: "Business Hours",
    description: "Set operating hours, holidays, and scheduling preferences",
    icon: Clock,
    href: "/dashboard/settings/hours",
    managerAccess: true,
  },
  {
    id: "security",
    title: "Security Settings",
    description: "Configure password policies, session timeouts, and security rules",
    icon: Lock,
    href: "/dashboard/settings/security",
    adminOnly: true,
  },
  {
    id: "system-health",
    title: "System Health",
    description: "Monitor system performance, disk usage, and health metrics",
    icon: Activity,
    href: "/dashboard/settings/health",
    adminOnly: true,
  },
  {
    id: "general",
    title: "General Settings",
    description: "Basic shop information, branding, and general preferences",
    icon: Settings,
    href: "/dashboard/settings/general",
    managerAccess: true,
  },
]

export function SettingsOverview() {
  const { user } = useAuth()
  const [isManagePaymentMethodsDialogOpen, setIsManagePaymentMethodsDialogOpen] = useState(false);
  const [isManagePaymentCategoriesDialogOpen, setIsManagePaymentCategoriesDialogOpen] = useState(false);

  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"

  // Filter settings based on user permissions
  const availableSettings = settingsCategories.filter((setting) => {
    if (setting.adminOnly && !isAdmin) return false
    if (setting.managerAccess && !isAdmin && !isManager) return false
    return true
  })

  const handleNavigate = (href: string) => {
    window.location.href = href
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <Settings className="h-8 w-8 text-red-600" />
          Settings
        </h1>
        <p className="text-gray-600 mt-2">Configure and manage your A+ express repair shop system</p>
      </div>

      {/* Access Level Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Access Level: {user?.role}</p>
              <p className="text-sm text-blue-700">
                {isAdmin
                  ? "You have full administrative access to all settings."
                  : isManager
                    ? "You have manager-level access to most settings."
                    : "You have limited access to settings based on your role."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableSettings.map((setting) => (
          <Card
            key={setting.id}
            className="border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={() => handleNavigate(setting.href)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                    <setting.icon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium text-gray-900 group-hover:text-red-700 transition-colors">
                      {setting.title}
                    </CardTitle>
                  </div>
                </div>
                {setting.badge && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                    {setting.badge}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm leading-relaxed">{setting.description}</CardDescription>
              <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto text-red-600 hover:text-red-700 font-medium">
                Configure →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-gray-600 text-sm">Common administrative tasks and shortcuts</p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate("/dashboard/settings/audit-log")}
                    className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    View Audit Log
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate("/dashboard/settings/backup")}
                    className="border-gray-300 text-gray-700 bg-transparent"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Backup System
                  </Button>
                </>
              )}
              {(isAdmin || isManager) && (
                <Button
                  variant="outline"
                  onClick={() => handleNavigate("/dashboard/settings/users")}
                  className="border-gray-300 text-gray-700 bg-transparent"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              )}
              {(isAdmin || isManager) && (
                <>
                  <Dialog open={isManagePaymentMethodsDialogOpen} onOpenChange={setIsManagePaymentMethodsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Payment Methods
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage Payment Methods</DialogTitle>
                      </DialogHeader>
                      <ManagePaymentMethodsDialog onClose={() => setIsManagePaymentMethodsDialogOpen(false)} />
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isManagePaymentCategoriesDialogOpen} onOpenChange={setIsManagePaymentCategoriesDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Payment Categories
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage Payment Categories</DialogTitle>
                      </DialogHeader>
                      <ManagePaymentCategoriesDialog onClose={() => setIsManagePaymentCategoriesDialogOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
