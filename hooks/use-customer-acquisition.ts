import { useQuery } from '@tanstack/react-query';
import { getCustomerMonthlyAcquisition } from '@/lib/api-client';

interface MonthlyAcquisitionData {
  month: string;
  customers: number;
}

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
