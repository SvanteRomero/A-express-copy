import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Customer, PhoneNumber } from '@/components/customers/types';

// This allows for phone numbers that don't have an ID yet
type UpdatablePhoneNumber = Omit<PhoneNumber, 'id'> & { id?: number };

type UpdatableCustomer = Omit<Customer, 'has_debt' | 'phone_numbers'> & {
  phone_numbers: UpdatablePhoneNumber[];
};

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