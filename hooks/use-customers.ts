import { useQuery } from '@tanstack/react-query';
import { searchCustomers } from '@/lib/api-client';
import { PaginatedResponse } from '@/lib/api';
import { Customer } from '@/components/customers/types';

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
