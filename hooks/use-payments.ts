"use client"

import { useQuery } from '@tanstack/react-query'
import { getPayments } from '@/lib/payments-api'
import { getPaymentMethods, getPaymentCategories, apiClient } from '@/lib/api-client'
import { PaymentMethod } from '@/components/financials/types'
import { PaymentCategory } from '@/components/tasks/types'

// ============================================================================
// Types
// ============================================================================

interface PaymentFilters {
  method?: string;
  is_refunded?: boolean;
  date?: string;
  category?: string;
  search?: string;
  task_payments?: boolean;
  page?: number;
  page_size?: number;
}

interface RevenueOverview {
  opening_balance?: number;
  today_revenue: number;
  day_over_day_change: number;
  today_expenditure?: number;
  expenditure_day_over_day_change?: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated payments with optional filters
 */
export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => getPayments(filters),
  });
}

/**
 * Fetch all payment methods (e.g., Cash, M-Pesa, Bank Transfer)
 */
export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await getPaymentMethods();
      const data = response.data;
      // Handle both paginated and non-paginated responses
      if (data && Array.isArray(data.results)) {
        return data.results;
      }
      return data;
    },
  });
}

/**
 * Fetch all payment categories (e.g., Repair, Service, Parts)
 */
export function usePaymentCategories() {
  return useQuery<PaymentCategory[]>({
    queryKey: ['payment-categories'],
    queryFn: () => getPaymentCategories().then((res) => res.data),
  });
}

/**
 * Fetch revenue overview statistics (opening balance, today's revenue/expenditure, day-over-day changes)
 */
export function useRevenueOverview() {
  return useQuery<RevenueOverview>({
    queryKey: ['revenue-overview'],
    queryFn: async () => {
      const response = await apiClient.get('/revenue-overview/');
      return response.data;
    },
  });
}