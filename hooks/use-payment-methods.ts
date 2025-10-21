import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

export interface PaymentMethod {
  id: number;
  name: string;
}

const fetcher = async (url: string) => {
  const res = await apiClient.get(url);
  const data = res.data;
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return data;
};

export function usePaymentMethods() {
  const { data, error, isLoading, mutate } = useSWR<PaymentMethod[]>('/payment-methods/', fetcher);
  return { data, error, isLoading, mutate };
}
