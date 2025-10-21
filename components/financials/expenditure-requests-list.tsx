'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenditureRequests, approveExpenditureRequest, rejectExpenditureRequest } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { Button } from "@/components/ui/core/button";
import { Badge } from "@/components/ui/core/badge";
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export function ExpenditureRequestsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['expenditureRequests'],
    queryFn: () => getExpenditureRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: approveExpenditureRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (data.task_title) {
        queryClient.invalidateQueries({ queryKey: ['task', data.task_title] });
      }
      toast({ title: "Success", description: "Expenditure request approved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.detail || "Failed to approve request.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectExpenditureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      toast({ title: "Success", description: "Expenditure request rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.detail || "Failed to reject request.", variant: "destructive" });
    },
  });

  const isManager = user?.role === 'Manager';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge className='bg-yellow-100 text-yellow-800'>Pending</Badge>
      case 'Approved':
        return <Badge className='bg-green-100 text-green-800'>Approved</Badge>
      case 'Rejected':
        return <Badge className='bg-red-100 text-red-800'>Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Approver</TableHead>
            {isManager && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={isManager ? 7 : 6} className="h-24 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : requests?.data.map((request: any) => (
            <TableRow key={request.id}>
              <TableCell>{request.description}</TableCell>
              <TableCell>TSh {parseFloat(request.amount).toFixed(2)}</TableCell>
              <TableCell>{request.task_title || 'N/A'}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>{request.requester.username}</TableCell>
              <TableCell>{request.approver?.username || 'N/A'}</TableCell>
              {isManager && (
                <TableCell>
                  {request.status === 'Pending' && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(request.id)} disabled={approveMutation.isPending}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(request.id)} disabled={rejectMutation.isPending}>
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
