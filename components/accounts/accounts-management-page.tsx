'use client';

import { useState } from 'react';
import { useAccounts, Account } from '@/hooks/use-accounts';
import { Button } from '@/components/ui/core/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/layout/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/layout/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/feedback/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/feedback/alert-dialog';
import { Input } from '@/components/ui/core/input';
import { Label } from '@/components/ui/core/label';
import { CurrencyInput } from '@/components/ui/core/currency-input';
import { PlusCircle, Edit, Trash2, Loader2, DollarSign, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

export function AccountsManagementPage() {
  const { accounts, isLoadingAccounts, createAccount, updateAccount, deleteAccount, isCreating, isUpdating, isDeleting } = useAccounts();
  const isMobile = useIsMobile();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [newName, setNewName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  const handleCreate = async () => {
    await createAccount({ name: newAccountName, balance: initialBalance });
    setIsCreateDialogOpen(false);
    setNewAccountName('');
    setInitialBalance(0);
  };

  const handleUpdate = async () => {
    if (selectedAccount) {
      await updateAccount({ id: selectedAccount.id, data: { name: newName } });
      setIsEditDialogOpen(false);
      setSelectedAccount(null);
    }
  };

  const handleDelete = async (accountId: number) => {
    await deleteAccount(accountId);
  };

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account);
    setNewName(account.name);
    setIsEditDialogOpen(true);
  };

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading accounts...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center"><Banknote className="mr-2" /> Internal Accounts</CardTitle>
            <CardDescription>Create and manage internal company accounts.</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input id="account-name" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="e.g., Petty Cash" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="initial-balance">Initial Balance</Label>
                  <CurrencyInput id="initial-balance" value={initialBalance} onValueChange={setInitialBalance} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{account.name}</div>
                      <div className="text-xs text-muted-foreground">ID: {account.id}</div>
                    </div>
                    <div className="flex items-center text-green-600 font-bold">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {parseFloat(account.balance).toLocaleString('sw-TZ', { style: 'currency', currency: 'TZS' })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Created By: </span>
                    {account.created_by?.full_name || 'N/A'}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Created At: </span>
                    {format(new Date(account.created_at), 'PPP')}
                  </div>
                </CardContent>
                <div className="p-2 bg-gray-50 flex justify-end gap-2 border-t rounded-b-lg">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(account)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the account "{account.name}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(account.id)} disabled={isDeleting}>
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.id}</TableCell>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      {parseFloat(account.balance).toLocaleString('sw-TZ', { style: 'currency', currency: 'TZS' })}
                    </div>
                  </TableCell>
                  <TableCell>{account.created_by?.full_name || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(account.created_at), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(account)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the account "{account.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(account.id)} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {accounts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No accounts found. Get started by creating one.
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Name</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-account-name">Account Name</Label>
              <Input id="edit-account-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
