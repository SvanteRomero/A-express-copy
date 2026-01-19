import { useQuery } from '@tanstack/react-query'
import { listWorkshopLocations, getLocations } from '@/lib/api-client'
import { Location } from "@/components/locations/types";

export function useLocations() {
    return useQuery<Location[]>({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await getLocations();
            return response.data;
        },
    });
}

export function useWorkshopLocations() {
    return useQuery<Location[]>({
        queryKey: ['workshopLocations'],
        queryFn: async () => {
            const response = await listWorkshopLocations();
            return response.data;
        },
    });
}
