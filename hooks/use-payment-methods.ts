import useSWR from 'swr';
import { fetchPaymentMethods } from '@/lib/api-client';

import { PaymentMethod } from '@/components/financials/types';

export function usePaymentMethods() {
  const { data, error, isLoading, mutate } = useSWR<PaymentMethod[]>(
    '/payment-methods/',
    fetchPaymentMethods
  );
  return { data, error, isLoading, mutate };
}
