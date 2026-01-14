'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenditureRequests, approveExpenditureRequest, rejectExpenditureRequest } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Badge } from "@/components/ui/core/badge";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import { TableSkeleton } from "@/components/ui/core/loaders";

export function ExpenditureRequestsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const pageSize = 10; // Or a configurable value

  const { data: requests, isLoading } = useQuery<any>({
    queryKey: ['expenditureRequests', page, pageSize],
    queryFn: () => getExpenditureRequests({ page, page_size: pageSize }),
  });

  const approveMutation = useMutation({
    mutationFn: approveExpenditureRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (data.data.task_title) {
        queryClient.invalidateQueries({ queryKey: ['task', data.data.task_title] });
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
  const isAccountant = user?.role === 'Accountant'; // Assuming an Accountant role might also approve/reject

  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(id);
  };

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
      {isLoading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : requests?.results && requests.results.length > 0 ? (
        isMobile ? (
          <div className="space-y-4 p-4">
            {requests.results.map((request: any) => (
              <Card key={request.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{request.description}</div>
                      <div className="text-xs text-muted-foreground">{request.date ? format(new Date(request.date), 'PPP') : 'N/A'}</div>
                    </div>
                    <div className="font-bold">
                      TSh {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(request.amount))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                    <span className="text-muted-foreground">Category: {request.category_name || 'N/A'}</span>
                    <Badge variant={request.status === 'Approved' ? 'default' : request.status === 'Rejected' ? 'destructive' : 'secondary'}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Requester: {request.requester_name || request.requester?.username || 'Unknown'}</span>
                  </div>
                  {request.status === 'Pending' && (isManager || isAccountant) && (
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleReject(request.id)} disabled={rejectMutation.isPending}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {(isManager || isAccountant) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.results.map((request: any) => (
                <TableRow key={request.id}>
                  <TableCell>{request.description}</TableCell>
                  <TableCell>TSh {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(request.amount))}</TableCell>
                  <TableCell>{request.category_name || 'N/A'}</TableCell>
                  <TableCell>{request.requester_name || request.requester?.username || 'Unknown'}</TableCell>
                  <TableCell>{request.date ? format(new Date(request.date), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={request.status === 'Approved' ? 'default' : request.status === 'Rejected' ? 'destructive' : 'secondary'}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  {(isManager || isAccountant) && (
                    <TableCell>
                      {request.status === 'Pending' && (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(request.id)} disabled={rejectMutation.isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : null}
      <div className="flex justify-end space-x-2 p-4">
        <Button
          onClick={() => setPage(prev => Math.max(1, prev - 1))}
          disabled={!requests?.previous || isLoading}
        >
          Previous
        </Button>
        <Button
          onClick={() => setPage(prev => prev + 1)}
          disabled={!requests?.next || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
