
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
import { useUpdateTask, useCreateCostBreakdown } from '@/hooks/use-tasks';
import { useTaskUrgencyOptions, useTechnicians } from '@/hooks/use-data';
import { useMutation } from '@tanstack/react-query';
import { addTaskActivity } from '@/lib/api-client';

interface ReturnTaskDialogProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ReturnTaskDialog({ task, isOpen, onClose }: ReturnTaskDialogProps) {
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState<number | '' >('');
  const [urgency, setUrgency] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [renegotiate, setRenegotiate] = useState(false);
  const updateTaskMutation = useUpdateTask();
  const createCostBreakdownMutation = useCreateCostBreakdown();
  const { data: urgencyOptions } = useTaskUrgencyOptions();
  const { data: technicians } = useTechnicians();

  const addTaskActivityMutation = useMutation({ 
    mutationFn: (data: any) => addTaskActivity(task.title, data)
  });

  const handleSubmit = () => {
    if (renegotiate) {
      const costDifference = (newEstimatedCost || 0) - task.total_cost;
      createCostBreakdownMutation.mutate({
        taskId: task.title,
        costBreakdown: {
          description: 'Renegotiation on Return',
          amount: costDifference,
          cost_type: costDifference > 0 ? 'Additive' : 'Subtractive',
        },
      });
    }

    if (newIssueDescription) {
      addTaskActivityMutation.mutate({ type: 'returned', message: newIssueDescription });
    }

    updateTaskMutation.mutate({
      id: task.title,
      updates: {
        status: 'In Progress',
        estimated_cost: newEstimatedCost || task.estimated_cost,
        urgency: urgency || task.urgency,
        assigned_to: assignedTo || task.assigned_to,
      },
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
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
            <Checkbox id="renegotiate" checked={renegotiate} onCheckedChange={(checked) => setRenegotiate(checked === true)} />
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
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.first_name} {technician.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Return Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
