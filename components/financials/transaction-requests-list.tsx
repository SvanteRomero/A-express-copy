'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenditureRequests, approveExpenditureRequest, rejectExpenditureRequest, deleteExpenditureRequest } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Card, CardContent, CardHeader } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Badge } from "@/components/ui/core/badge";
import { Input } from "@/components/ui/core/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { useAuth } from '@/hooks/use-auth';
import {
  showExpenditureApprovedToast,
  showExpenditureApprovalErrorToast,
  showExpenditureRejectedToast,
  showExpenditureRejectionErrorToast,
  showExpenditureCancelledToast,
  showExpenditureCancellationErrorToast,
} from '@/components/notifications/toast';
import { useState } from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from 'date-fns';
import { Check, X, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { TableSkeleton } from "@/components/ui/core/loaders";

export function TransactionRequestsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const pageSize = 10;

  const { data: requests, isLoading } = useQuery<any>({
    queryKey: ['transactionRequests', page, pageSize, searchTerm, statusFilter, typeFilter],
    queryFn: () => getExpenditureRequests({
      page,
      page_size: pageSize,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      transaction_type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: approveExpenditureRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (data.data.task_title) {
        queryClient.invalidateQueries({ queryKey: ['task', data.data.task_title] });
      }
      showExpenditureApprovedToast();
    },
    onError: (error: any) => {
      showExpenditureApprovalErrorToast(error.response?.data?.detail);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectExpenditureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      showExpenditureRejectedToast();
    },
    onError: (error: any) => {
      showExpenditureRejectionErrorToast(error.response?.data?.detail);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: deleteExpenditureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      showExpenditureCancelledToast();
    },
    onError: (error: any) => {
      showExpenditureCancellationErrorToast(error.response?.data?.detail);
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

  const handleCancel = (id: number) => {
    cancelMutation.mutate(id);
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

  const getTypeBadge = (type: string) => {
    if (type === 'Revenue') {
      return (
        <Badge className='bg-green-100 text-green-700 border-green-200'>
          <TrendingUp className="h-3 w-3 mr-1" />
          Revenue
        </Badge>
      );
    }
    return (
      <Badge className='bg-amber-100 text-amber-700 border-amber-200'>
        <TrendingDown className="h-3 w-3 mr-1" />
        Expenditure
      </Badge>
    );
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  return (
    <div className='space-y-4'>
      {/* Filter Toolbar */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className={isMobile ? 'w-full' : 'w-[150px]'}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
          <SelectTrigger className={isMobile ? 'w-full' : 'w-[150px]'}>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Revenue">Revenue</SelectItem>
            <SelectItem value="Expenditure">Expenditure</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className={`text-muted-foreground hover:text-foreground ${isMobile ? 'w-full' : ''}`}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table/Cards */}
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
                        <div className="text-xs text-muted-foreground">{request.created_at ? format(new Date(request.created_at), 'PPP') : 'N/A'}</div>
                      </div>
                      <div className="font-bold">
                        TSh {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(request.amount))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                      <span className="text-muted-foreground">Category: {request.category?.name || 'N/A'}</span>
                      {getTypeBadge(request.transaction_type)}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Approver: {request.approver_name || request.approver?.username || 'Pending'}</span>
                      <Badge variant={request.status === 'Approved' ? 'default' : request.status === 'Rejected' ? 'destructive' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>
                    {request.status === 'Pending' && (
                      <div className="flex justify-end gap-2 mt-2">
                        {isManager && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleReject(request.id)} disabled={rejectMutation.isPending}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {isAccountant && !isManager && (
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleCancel(request.id)} disabled={cancelMutation.isPending}>
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        )}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {(isManager || isAccountant) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.results.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>{getTypeBadge(request.transaction_type)}</TableCell>
                    <TableCell>{request.description}</TableCell>
                    <TableCell className={request.transaction_type === 'Revenue' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                      TSh {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(request.amount))}
                    </TableCell>
                    <TableCell>{request.category?.name || 'N/A'}</TableCell>
                    <TableCell>{request.approver_name || request.approver?.username || 'Pending'}</TableCell>
                    <TableCell>{request.created_at ? format(new Date(request.created_at), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={request.status === 'Approved' ? 'default' : request.status === 'Rejected' ? 'destructive' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    {(isManager || isAccountant) && (
                      <TableCell>
                        {request.status === 'Pending' && (
                          <div className="flex space-x-2">
                            {isManager && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(request.id)} disabled={rejectMutation.isPending}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isAccountant && !isManager && (
                              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleCancel(request.id)} disabled={cancelMutation.isPending}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
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
    </div>
  );
}
