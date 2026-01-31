"use client"

import { useQuery } from '@tanstack/react-query'
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
// API Functions
// ============================================================================

const getPayments = async (filters: PaymentFilters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.method && filters.method !== 'all') params.append('method', filters.method);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.is_refunded) params.append('is_refunded', String(filters.is_refunded));
    if (filters.date) params.append('date', filters.date);
    if (filters.search) params.append('search', filters.search);
    if (filters.task_payments) params.append('task_payments', String(filters.task_payments));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const response = await apiClient.get('/payments/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

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