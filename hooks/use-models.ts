import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Model } from '@/lib/api';

export function useModels(search: string = '') {
  const { data, isLoading, isError } = useQuery<Model[]>({
    queryKey: ['models', search],
    queryFn: async () => {
      const response = await apiClient.get(`common/models/?search=${search}`);
      return response.data;
    },
  });

  return { data, isLoading, isError };
}
