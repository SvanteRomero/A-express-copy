'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnifiedApprovalRequests,
  approveExpenditureRequest,
  rejectExpenditureRequest,
  deleteExpenditureRequest,
  approveDebtRequestFromList,
  rejectDebtRequestFromList
} from '@/lib/api-client';
import { UnifiedApprovalRequest, isTransactionRequest, isDebtRequest } from '@/components/financials/types';
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
import { Check, X, TrendingUp, TrendingDown, Search, FileText } from 'lucide-react';

export function RequestsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all'); // New: transaction/debt filter
  const pageSize = 10;

  const { data: requests, isLoading } = useQuery<any>({
    queryKey: ['unifiedApprovalRequests', page, pageSize, searchTerm, statusFilter, typeFilter, requestTypeFilter],
    queryFn: () => getUnifiedApprovalRequests({
      page,
      page_size: pageSize,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      transaction_type: typeFilter !== 'all' ? typeFilter : undefined,
      request_type: requestTypeFilter !== 'all' ? requestTypeFilter as 'transaction' | 'debt' : undefined,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: approveExpenditureRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unifiedApprovalRequests'] });
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
      queryClient.invalidateQueries({ queryKey: ['unifiedApprovalRequests'] });
      showExpenditureRejectedToast();
    },
    onError: (error: any) => {
      showExpenditureRejectionErrorToast(error.response?.data?.detail);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: deleteExpenditureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedApprovalRequests'] });
      showExpenditureCancelledToast();
    },
    onError: (error: any) => {
      showExpenditureCancellationErrorToast(error.response?.data?.detail);
    },
  });

  // Debt request mutations
  const approveDebtMutation = useMutation({
    mutationFn: approveDebtRequestFromList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedApprovalRequests'] });
      showExpenditureApprovedToast(); // Reuse toast for now
    },
    onError: (error: any) => {
      showExpenditureApprovalErrorToast(error.response?.data?.detail);
    },
  });

  const rejectDebtMutation = useMutation({
    mutationFn: rejectDebtRequestFromList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedApprovalRequests'] });
      showExpenditureRejectedToast(); // Reuse toast for now
    },
    onError: (error: any) => {
      showExpenditureRejectionErrorToast(error.response?.data?.detail);
    },
  });

  const isManager = user?.role === 'Manager';
  const isAccountant = user?.role === 'Accountant';

  const handleApprove = (request: UnifiedApprovalRequest) => {
    if (isDebtRequest(request)) {
      approveDebtMutation.mutate(request.id);
    } else {
      approveMutation.mutate(request.id);
    }
  };

  const handleReject = (request: UnifiedApprovalRequest) => {
    if (isDebtRequest(request)) {
      rejectDebtMutation.mutate(request.id);
    } else {
      rejectMutation.mutate(request.id);
    }
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

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || requestTypeFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setRequestTypeFilter('all');
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
        <Select value={requestTypeFilter} onValueChange={(value) => { setRequestTypeFilter(value); setPage(1); }}>
          <SelectTrigger className={isMobile ? 'w-full' : 'w-[150px]'}>
            <SelectValue placeholder="Request Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="transaction">Transactions</SelectItem>
            <SelectItem value="debt">Debts</SelectItem>
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

      {/* Notification-Style Cards */}
      <div className='space-y-3'>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : requests?.results && requests.results.length > 0 ? (
          requests.results.map((request: UnifiedApprovalRequest) => {
            const isDebt = isDebtRequest(request);
            const isTransaction = isTransactionRequest(request);

            // Dynamic styling based on request type
            const iconBg = isDebt
              ? 'bg-purple-100 text-purple-600'
              : (isTransaction && request.transaction_type === 'Revenue')
                ? 'bg-green-100 text-green-600'
                : 'bg-amber-100 text-amber-600';

            const icon = isDebt
              ? <FileText className="h-5 w-5" />
              : (isTransaction && request.transaction_type === 'Revenue')
                ? <TrendingUp className="h-5 w-5" />
                : <TrendingDown className="h-5 w-5" />;

            // Get description and amount based on type
            const title = isDebt
              ? `Debt Request: ${request.task_title}`
              : isTransaction
                ? request.description
                : 'Unknown Request';

            const amount = isTransaction ? request.amount : null;
            const subtitle = isDebt
              ? request.task_details?.customer_name || 'No customer'
              : isTransaction
                ? request.category?.name || 'No category'
                : '';

            const typeBadge = isDebt
              ? <Badge className="bg-purple-100 text-purple-700 border-purple-200"><FileText className="h-3 w-3 mr-1" />Debt</Badge>
              : isTransaction
                ? getTypeBadge(request.transaction_type)
                : null;

            return (
              <div
                key={`${request.request_type}-${request.id}`}
                className={`
                  rounded-lg border bg-card p-4 transition-all hover:shadow-md
                  ${request.status === 'Pending' ? 'border-l-4 border-l-yellow-400' : ''}
                  ${request.status === 'Approved' ? 'border-l-4 border-l-green-400 opacity-75' : ''}
                  ${request.status === 'Rejected' ? 'border-l-4 border-l-red-400 opacity-75' : ''}
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                      </div>

                      {/* Amount (for transactions) */}
                      {amount && (
                        <div className={`text-sm font-semibold ${isTransaction && request.transaction_type === 'Revenue' ? 'text-green-600' : 'text-amber-600'}`}>
                          TSh {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(amount))}
                        </div>
                      )}

                      {/* Outstanding balance for debt */}
                      {isDebt && request.task_details?.outstanding_balance && (
                        <div className="text-sm font-semibold text-purple-600">
                          TSh {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(request.task_details.outstanding_balance))}
                        </div>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                      {typeBadge}
                      {getStatusBadge(request.status)}
                      <span className="text-muted-foreground">
                        by {request.requester_name}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {request.created_at ? format(new Date(request.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </span>
                      {request.approver_name && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {request.status === 'Approved' ? '✓' : '✗'} by {request.approver_name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {request.status === 'Pending' && (isManager || isAccountant) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        {isManager && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleApprove(request)}
                              disabled={approveMutation.isPending || approveDebtMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleReject(request)}
                              disabled={rejectMutation.isPending || rejectDebtMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {isAccountant && !isManager && isTransaction && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleCancel(request.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No approval requests found
          </div>
        )}
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
