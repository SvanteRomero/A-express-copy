import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getTask, listWorkshopLocations, listWorkshopTechnicians, updateTask, listUsersByRole, getBrands, getLocations } from '@/lib/api-client'
import { getTaskStatusOptions, getTaskUrgencyOptions } from '@/lib/tasks-api'
import { User } from "@/lib/use-user-management"
import { Brand, Task } from '@/lib/api'

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
            const params = isWorkshopView
                ? { workshop_technician: userId, workshop_status: "In Workshop" }
                : { assigned_to: userId, status: "In Progress" };
            const response = await getTasks(params);
            const tasks = response.data.results || [];
            if (isWorkshopView) {
                return tasks;
            }
            return tasks.filter((task: any) => task.workshop_status !== "In Workshop");
        },
        enabled: !!userId, // only run the query if the user ID is available
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
