import { useQuery } from '@tanstack/react-query'
import { listUsersByRole, listAssignableUsers } from '@/lib/api-client'
import { User } from "@/hooks/use-user-management"

export function useTechnicians() {
    return useQuery<User[]>({
        queryKey: ['technicians'],
        queryFn: async () => {
            const response = await listUsersByRole('Technician');
            return response.data;
        },
    });
}

export function useManagers() {
    return useQuery<User[]>({
        queryKey: ['managers'],
        queryFn: async () => {
            const response = await listUsersByRole('Manager');
            return response.data;
        },
    });
}



export function useAssignableUsers() {
    return useQuery<User[]>({
        queryKey: ['assignableUsers'],
        queryFn: async () => {
            const response = await listAssignableUsers();
            return response.data;
        },
    });
}
