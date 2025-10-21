'use client';

import { Button } from '@/components/ui/core/button';
import { DialogFooter } from '@/components/ui/feedback/dialog';
import { Input } from '@/components/ui/core/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/layout/table';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';

interface ManagePaymentMethodsDialogProps {
  onClose: () => void;
}

export default function ManagePaymentMethodsDialog({
  onClose,
}: ManagePaymentMethodsDialogProps) {
  const queryClient = useQueryClient();
  const { data: paymentMethods, mutate: refetchPaymentMethods } = usePaymentMethods();
  const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any | null>(null);

  const createPaymentMethodMutation = useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      refetchPaymentMethods();
      setNewPaymentMethodName("");
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      updatePaymentMethod(id, data),
    onSuccess: () => {
      refetchPaymentMethods();
      setEditingPaymentMethod(null);
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      refetchPaymentMethods();
    },
  });

  return (
    <>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New payment method"
              value={newPaymentMethodName}
              onChange={(e) => setNewPaymentMethodName(e.target.value)}
            />
            <Button onClick={() => createPaymentMethodMutation.mutate({ name: newPaymentMethodName })}>
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
              {paymentMethods?.map((method) => (
                <TableRow key={method.id}>
                  <TableCell>
                    {editingPaymentMethod?.id === method.id ? (
                      <Input
                        value={editingPaymentMethod.name}
                        onChange={(e) =>
                          setEditingPaymentMethod({ ...editingPaymentMethod, name: e.target.value })
                        }
                      />
                    ) : (
                      method.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingPaymentMethod?.id === method.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updatePaymentMethodMutation.mutate({
                              id: editingPaymentMethod.id,
                              data: { name: editingPaymentMethod.name },
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPaymentMethod(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingPaymentMethod(method)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePaymentMethodMutation.mutate(method.id)}
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