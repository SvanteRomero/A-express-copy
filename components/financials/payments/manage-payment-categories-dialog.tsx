'use client';

import { Button } from '@/components/ui/core/button';
import { DialogFooter } from '@/components/ui/feedback/dialog';
import { Input } from '@/components/ui/core/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/layout/table';
import { usePaymentCategories } from '@/hooks/use-payment-categories';
import { createPaymentCategory, updatePaymentCategory, deletePaymentCategory } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';

interface ManagePaymentCategoriesDialogProps {
  onClose: () => void;
}

export default function ManagePaymentCategoriesDialog({
  onClose,
}: ManagePaymentCategoriesDialogProps) {
  const queryClient = useQueryClient();
  const { data: paymentCategories, refetch: refetchPaymentCategories } = usePaymentCategories();
  const [newPaymentCategoryName, setNewPaymentCategoryName] = useState("");
  const [editingPaymentCategory, setEditingPaymentCategory] = useState<any | null>(null);

  const createPaymentCategoryMutation = useMutation({
    mutationFn: createPaymentCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-categories'] });
      setNewPaymentCategoryName("");
    },
  });

  const updatePaymentCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      updatePaymentCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-categories'] });
      setEditingPaymentCategory(null);
    },
  });

  const deletePaymentCategoryMutation = useMutation({
    mutationFn: deletePaymentCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-categories'] });
    },
  });

  return (
    <>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New payment category"
              value={newPaymentCategoryName}
              onChange={(e) => setNewPaymentCategoryName(e.target.value)}
            />
            <Button onClick={() => createPaymentCategoryMutation.mutate({ name: newPaymentCategoryName })}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentCategories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {editingPaymentCategory?.id === category.id ? (
                      <Input
                        value={editingPaymentCategory.name}
                        onChange={(e) =>
                          setEditingPaymentCategory({ ...editingPaymentCategory, name: e.target.value })
                        }
                      />
                    ) : (
                      category.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingPaymentCategory?.id === category.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updatePaymentCategoryMutation.mutate({
                              id: editingPaymentCategory.id,
                              data: { name: editingPaymentCategory.name },
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPaymentCategory(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingPaymentCategory(category)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePaymentCategoryMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
    </>
  );
}