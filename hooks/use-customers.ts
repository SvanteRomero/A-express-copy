import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchCustomers, getCustomerStats, getCustomerMonthlyAcquisition, apiClient } from '@/lib/api-client';
import { PaginatedResponse } from '@/lib/api';
import { Customer, PhoneNumber } from '@/components/customers/types';

// ============================================================================
// Types
// ============================================================================

interface CustomerStats {
  credit_customers_count: number;
}

interface MonthlyAcquisitionData {
  month: string;
  customers: number;
}

// This allows for phone numbers that don't have an ID yet
type UpdatablePhoneNumber = Omit<PhoneNumber, 'id'> & { id?: number };

type UpdatableCustomer = Omit<Customer, 'has_debt' | 'phone_numbers'> & {
  phone_numbers: UpdatablePhoneNumber[];
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated customers with search
 */
export function useCustomers({ query, page }: { query: string; page: number }) {
  const { data, isLoading, isError } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', { query, page }],
    queryFn: async () => {
      const response = await searchCustomers({ search: query, page });
      return response.data;
    },
  });

  return { data, isLoading, isError };
}

/**
 * Fetch customer statistics (e.g., credit customers count)
 */
export function useCustomerStats() {
  const { data, isError, isLoading } = useQuery<CustomerStats>({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const response = await getCustomerStats();
      return response.data;
    },
  });

  return {
    stats: data,
    isLoading,
    isError,
  };
}

/**
 * Fetch monthly customer acquisition data for charts
 */
export function useCustomerAcquisition() {
  const { data, isError, isLoading } = useQuery<MonthlyAcquisitionData[]>({
    queryKey: ['customer-acquisition'],
    queryFn: async () => {
      const response = await getCustomerMonthlyAcquisition();
      return response.data;
    },
  });

  return {
    data,
    isLoading,
    isError,
  };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mutation hook to update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: UpdatableCustomer) => {
      // Transform phone_numbers to phone_numbers_write for the backend serializer
      const payload = {
        id: customer.id,
        name: customer.name,
        customer_type: customer.customer_type,
        phone_numbers_write: customer.phone_numbers,
      };
      const response = await apiClient.put(`customers/${customer.id}/`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
    },
  });
}
