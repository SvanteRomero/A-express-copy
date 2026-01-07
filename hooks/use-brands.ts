import { useQuery } from '@tanstack/react-query'
import { getBrands } from '@/lib/api-client'
import { Brand } from '@/components/brands/types';

export function useBrands() {
    return useQuery<Brand[]>({
        queryKey: ['brands'],
        queryFn: async () => {
            const response = await getBrands();
            return response.data;
        },
    });
}
