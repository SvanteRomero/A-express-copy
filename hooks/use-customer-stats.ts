import { useQuery } from '@tanstack/react-query';
import { getCustomerStats } from '@/lib/api-client';

interface CustomerStats {
  credit_customers_count: number;
}

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
