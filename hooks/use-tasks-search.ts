import { useQuery } from '@tanstack/react-query';
import { searchTasks } from '@/lib/api-client';

export function useTasksSearch({ query, enabled = true, pageSize = 4 }: { query: string; enabled?: boolean; pageSize?: number }) {
    return useQuery({
        queryKey: ['tasks-search', { query, pageSize }],
        queryFn: async () => {
            const response = await searchTasks({ search: query, page_size: pageSize });
            return response.data;
        },
        enabled: enabled && query.length > 0,
        staleTime: 1000 * 60, // 1 minute
    });
}
