'use client';

import { useAuth } from '@/hooks/use-auth';
import { AccountsManagementPage } from '@/components/accounts/accounts-management-page';

export default function ManagerAccountsPage() {
  const { user } = useAuth();

  // Check if user has manager access
  const hasManagerAccess = user?.role === 'Administrator' || user?.role === 'Manager';

  if (!hasManagerAccess) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AccountsManagementPage />
    </div>
  );
}

