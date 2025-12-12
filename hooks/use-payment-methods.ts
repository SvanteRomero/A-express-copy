import useSWR from 'swr';
import { fetchPaymentMethods } from '@/lib/api-client';

export interface PaymentMethod {
  id: number;
  name: string;
}

export function usePaymentMethods() {
  const { data, error, isLoading, mutate } = useSWR<PaymentMethod[]>(
    '/payment-methods/',
    fetchPaymentMethods
  );
  return { data, error, isLoading, mutate };
}
