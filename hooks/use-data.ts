import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getTask, listWorkshopLocations, listWorkshopTechnicians, updateTask, listUsersByRole, getBrands, getLocations } from '@/lib/api-client'
import { getTaskStatusOptions, getTaskUrgencyOptions } from '@/lib/tasks-api'
import { User } from "@/lib/use-user-management"
import { Brand } from '@/components/brands/types';
import { Task } from '@/components/tasks/types';

interface Location {
    id: number;
    name: string;
    is_workshop: boolean;
}

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

export function useBrands() {
    return useQuery<Brand[]>({
        queryKey: ['brands'],
        queryFn: async () => {
            const response = await getBrands();
            return response.data;
        },
    });
}

export function useLocations() {
    return useQuery<Location[]>({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await getLocations();
            return response.data;
        },
    });
}


export function useInProgressTasks(isWorkshopView: boolean, userId: string | undefined) {
    return useQuery<Task[]>({
        queryKey: ['inProgressTasks', isWorkshopView, userId],
        queryFn: async () => {
            if (!userId) return [];

            if (isWorkshopView) {
                // For workshop techs, fetch both sets of tasks and merge them
                const normalTasksPromise = getTasks({ assigned_to: userId, status: "In Progress" });
                const workshopTasksPromise = getTasks({ workshop_technician: userId, status: "In Progress" });

                const [normalTasksResponse, workshopTasksResponse] = await Promise.all([
                    normalTasksPromise,
                    workshopTasksPromise,
                ]);

                const normalTasks = normalTasksResponse.data.results?.filter((task: { workshop_status: string }) => task.workshop_status !== "In Workshop") || [];
                const workshopTasks = workshopTasksResponse.data.results || [];

                // Merge and de-duplicate
                const allTasks = new Map<number, Task>();
                normalTasks.forEach((task: Task) => allTasks.set(task.id, task));
                workshopTasks.forEach((task: Task) => allTasks.set(task.id, task));

                return Array.from(allTasks.values());

            } else {
                // For normal techs, fetch their assigned tasks and filter out workshop ones
                const response = await getTasks({ assigned_to: userId, status: "In Progress" });
                const tasks = response.data.results || [];
                return tasks.filter((task: any) => task.workshop_status !== "In Workshop");
            }
        },
        enabled: !!userId,
    });
}

export function useInWorkshopTasks() {
    return useQuery<Task[]>({
        queryKey: ['inWorkshopTasks'],
        queryFn: async () => {
            const response = await getTasks({ workshop_status: "In Workshop" });
            return response.data.results || [];
        },
    });
}

export function useCompletedTasks(userId: string | undefined) {
    return useQuery<Task[]>({
        queryKey: ['completedTasks', userId],
        queryFn: async () => {
            if (!userId) return [];
            const response = await getTasks({ status: "Completed", assigned_to: userId });
            return response.data.results || [];
        },
        enabled: !!userId, // only run the query if the user ID is available
    });
}

export function useTask(taskId: string) {
    return useQuery<Task>({
        queryKey: ['task', taskId],
        queryFn: async () => {
            const response = await getTask(taskId);
            return response.data;
        },
        enabled: !!taskId,
    });
}

export function useTaskStatusOptions() {
    return useQuery<string[][]>({
        queryKey: ['taskStatusOptions'],
        queryFn: async () => {
            const response = await getTaskStatusOptions();
            return response;
        },
    });
}

export function useTaskUrgencyOptions() {
    return useQuery<string[][]>({
        queryKey: ['taskUrgencyOptions'],
        queryFn: async () => {
            const response = await getTaskUrgencyOptions();
            return response;
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

export function useWorkshopTechnicians() {
    return useQuery<User[]>({
        queryKey: ['workshopTechnicians'],
        queryFn: async () => {
            const response = await listWorkshopTechnicians();
            return response.data;
        },
    });
}

export function useTechnicianHistoryTasks(userId: string | number | undefined) {
    return useQuery<Task[]>({
        queryKey: ['technicianHistoryTasks', userId],
        queryFn: async () => {
            if (!userId) return [];
            const response = await getTasks({
                status: "Picked Up,Ready for Pickup",
                activity_user: userId
            });
            return response.data.results || [];
        },
        enabled: !!userId,
    });
}
