'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/feedback/dialog';
import { Button } from '@/components/ui/core/button';
import { CurrencyInput } from '@/components/ui/core/currency-input';
import { Label } from '@/components/ui/core/label';
import { Textarea } from '@/components/ui/core/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/core/select';
import { Checkbox } from '@/components/ui/core/checkbox';
import { useReturnTask, useTaskUrgencyOptions } from '@/hooks/use-tasks';
import { useAssignableUsers } from '@/hooks/use-users';

interface ReturnTaskDialogProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ReturnTaskDialog({ task, isOpen, onClose }: Readonly<ReturnTaskDialogProps>) {
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState<number | ''>('');
  const [urgency, setUrgency] = useState<string>(task.urgency ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(
    task.assigned_to ? String(task.assigned_to?.id ?? task.assigned_to) : ''
  );
  const [renegotiate, setRenegotiate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTaskMutation = useReturnTask();
  const { data: urgencyOptions } = useTaskUrgencyOptions();
  const { data: technicians } = useAssignableUsers();

  const costDifference =
    renegotiate && newEstimatedCost !== ''
      ? (newEstimatedCost) - Number(task.total_cost)
      : null;

  const handleSubmit = async () => {
    if (renegotiate && (newEstimatedCost === '' || (newEstimatedCost) <= 0)) {
      setError('Enter a valid new cost or uncheck Renegotiate.');
      return;
    }
    setError(null);
    try {
      await returnTaskMutation.mutateAsync({
        id: task.title,
        data: {
          issue_description: newIssueDescription || undefined,
          urgency,
          assigned_to: assignedTo || undefined,
          estimated_cost: renegotiate ? newEstimatedCost : undefined,
          renegotiation:
            renegotiate && costDifference !== null
              ? {
                  amount: Math.abs(costDifference),
                  cost_type: costDifference >= 0 ? 'Additive' : 'Subtractive',
                }
              : undefined,
        },
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !returnTaskMutation.isPending) onClose();
      }}
    >
      <DialogContent key={task.title}>
        <DialogHeader>
          <DialogTitle>Return Task: {task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-issue-description">New Issue Description (Optional)</Label>
            <Textarea
              id="new-issue-description"
              value={newIssueDescription}
              onChange={(e) => setNewIssueDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="renegotiate"
              checked={renegotiate}
              onCheckedChange={(checked) => {
                setRenegotiate(checked === true);
                setNewEstimatedCost('');
              }}
            />
            <Label htmlFor="renegotiate">Renegotiate</Label>
          </div>
          {renegotiate && (
            <div>
              <Label htmlFor="new-estimated-cost">New Estimated Cost</Label>
              <CurrencyInput
                id="new-estimated-cost"
                value={newEstimatedCost}
                onValueChange={(value) => setNewEstimatedCost(value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current total: TSh {Number(task.total_cost).toLocaleString()}
              </p>
              {costDifference !== null && costDifference < 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  This will reduce the total cost by TSh {Math.abs(costDifference).toLocaleString()}.
                </p>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="urgency">Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions?.map((option: string[]) => (
                  <SelectItem key={option[0]} value={option[0]}>
                    {option[1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="assigned-to">Assign Technician</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians?.map((technician: any) => (
                  <SelectItem key={technician.id} value={String(technician.id)}>
                    {technician.first_name} {technician.last_name}
                    {technician.role === 'Manager' ? ' (Manager)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={returnTaskMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={returnTaskMutation.isPending}>
            {returnTaskMutation.isPending ? 'Returning...' : 'Return Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
