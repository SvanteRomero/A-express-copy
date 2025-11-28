import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useModels() {
  const { data, isLoading, isError } = useQuery<string[]>({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await apiClient.get('Eapp/models/');
      return response.data;
    },
  });

  return { data, isLoading, isError };
}
