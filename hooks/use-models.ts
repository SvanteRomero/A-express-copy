import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Model } from '@/lib/api';

export function useModels({ query }: { query: string }) {
  const { data, isLoading, isError } = useQuery<Model[]>({
    queryKey: ['models', { query }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) {
        params.set('search', query);
      }
      const response = await apiClient.get(`models/?${params.toString()}`);
      return response.data;
    },
  });

  return { data, isLoading, isError };
}
