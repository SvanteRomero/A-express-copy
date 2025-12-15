'use client'

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCostBreakdown, deleteCostBreakdown } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { DollarSign, Edit, Plus, Trash2 } from "lucide-react";
import { Task, CostBreakdown as CostBreakdownType } from '@/lib/api';

interface CostBreakdownProps {
  task: Task;
}

export function CostBreakdown({ task }: CostBreakdownProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [newBreakdown, setNewBreakdown] = useState({ amount: '', cost_type: 'Inclusive', category: '' });

  const costBreakdowns = task.cost_breakdowns?.filter(item => item.status === 'Approved') || [];
  const createMutation = useMutation({
    mutationFn: (data: any) => createCostBreakdown(task.title, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.title] });
      setIsAdding(false);
      setIsOtherCategory(false);
      setNewBreakdown({ amount: '', cost_type: 'Inclusive', category: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCostBreakdown(task.title, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.title] });
    },
  });

  const handleAdd = () => {
    createMutation.mutate({ ...newBreakdown, description: newBreakdown.category });
  };

  const isManager = user?.role === 'Manager';

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-600" />
            Cost Breakdown
          </CardTitle>
          {isManager && (
            <Button variant="outline" size="sm" onClick={() => {
              setIsAdding(!isAdding);
              if (isAdding) {
                setIsOtherCategory(false);
              }
            }} className="border-gray-300 text-gray-600 bg-transparent">
              <Plus className="h-3 w-3 mr-1" />
              {isAdding ? 'Cancel' : 'Add Item'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {isManager && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Estimated Cost</TableCell>
              <TableCell className="text-right">TSh {parseFloat(task.estimated_cost || '0').toFixed(2)}</TableCell>
              {isManager && <TableCell></TableCell>}
            </TableRow>
            {costBreakdowns?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell 
                  className={`text-right ${item.cost_type === 'Subtractive' ? 'text-red-600' : item.cost_type === 'Additive' ? 'text-green-600' : ''}`}>
                  {item.cost_type === 'Subtractive' ? '- ' : item.cost_type === 'Additive' ? '+ ' : ''}TSh {parseFloat(item.amount).toFixed(2)}
                </TableCell>
                {isManager && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {isAdding && (
              <TableRow>
                <TableCell>
                  {isOtherCategory ? (
                    <Input
                      type="text"
                      placeholder="Specify category..."
                      value={newBreakdown.category}
                      onChange={(e) => setNewBreakdown({ ...newBreakdown, category: e.target.value })}
                    />
                  ) : (
                    <Select
                      value={newBreakdown.category}
                      onValueChange={(value) => {
                        if (value === 'Other') {
                          setIsOtherCategory(true);
                          setNewBreakdown({ ...newBreakdown, category: '' });
                        } else {
                          setNewBreakdown({ ...newBreakdown, category: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Discount">Discount</SelectItem>
                        <SelectItem value="Commission">Commission</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <Select value={newBreakdown.cost_type} onValueChange={(value) => setNewBreakdown({ ...newBreakdown, cost_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inclusive">Include</SelectItem>
                      <SelectItem value="Additive">Add</SelectItem>
                      <SelectItem value="Subtractive">Subtract</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newBreakdown.amount}
                    onChange={(e) => setNewBreakdown({ ...newBreakdown, amount: e.target.value })}
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={handleAdd}>Add</Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Label className="text-base font-semibold text-gray-900">Total Cost</Label>
        <span className="text-xl font-bold text-red-600">TSh {parseFloat(task.total_cost || '0').toFixed(2)}</span>
      </CardFooter>
    </Card>
  );
}
