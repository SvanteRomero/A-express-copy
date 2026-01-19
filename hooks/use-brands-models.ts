import { useQuery } from '@tanstack/react-query'
import { getBrands, searchModels } from '@/lib/api-client'
import { Brand, Model } from '@/components/brands/types';

export function useBrands() {
    return useQuery<Brand[]>({
        queryKey: ['brands'],
        queryFn: async () => {
            const response = await getBrands();
            return response.data;
        },
    });
}

export function useModels({ query, brandId }: { query: string; brandId?: string }) {
    const { data, isLoading, isError } = useQuery<Model[]>({
        queryKey: ['models', { query, brandId }],
        queryFn: async () => {
            const response = await searchModels({ search: query, brand: brandId });
            // Handle both paginated (with .results) and non-paginated (direct array) responses
            return response.data.results || response.data;
        },
        enabled: true, // Always enabled, even if brandId is undefined (returns all models or searched models)
    });

    return { data, isLoading, isError };
}
