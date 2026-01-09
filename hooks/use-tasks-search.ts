import { useQuery } from '@tanstack/react-query';
import { searchTasks } from '@/lib/api-client';

export function useTasksSearch({ query, enabled = true }: { query: string; enabled?: boolean }) {
    return useQuery({
        queryKey: ['tasks-search', { query }],
        queryFn: async () => {
            const response = await searchTasks({ search: query, page_size: 4 });
            return response.data;
        },
        enabled: enabled && query.length > 0,
        staleTime: 1000 * 60, // 1 minute
    });
}
