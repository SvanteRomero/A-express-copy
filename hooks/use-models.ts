import { useQuery } from '@tanstack/react-query';
import { searchModels } from '@/lib/api-client';
import { Model } from '@/lib/api';

export function useModels({ query }: { query: string }) {
  const { data, isLoading, isError } = useQuery<Model[]>({
    queryKey: ['models', { query }],
    queryFn: async () => {
      const response = await searchModels({ search: query });
      // Handle both paginated (with .results) and non-paginated (direct array) responses
      return response.data.results || response.data;
    },
  });

  return { data, isLoading, isError };
}
