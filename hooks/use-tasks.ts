"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getTask, createTask, updateTask as apiUpdateTask, createCostBreakdown, getDebts, apiClient } from '@/lib/api-client'
import { Task, PaginatedTasks } from '@/components/tasks/types'

export const getTaskStatusOptions = async () => {
  try {
    const response = await apiClient.get('/tasks/status-options/');
    return response.data;
  } catch (error) {
    console.error('Error fetching task status options:', error);
    throw error;
  }
};

export const getTaskUrgencyOptions = async () => {
  try {
    const response = await apiClient.get('/tasks/urgency-options/');
    return response.data;
  } catch (error) {
    console.error('Error fetching task urgency options:', error);
    throw error;
  }
};

export function useTasks(filters?: {
  status?: string
  technician?: string
  search?: string
  page?: number
  page_size?: number
  updated_at_after?: string
  debts?: boolean
  template_filter?: string
  unpaid_tasks?: boolean
  payment_status?: string
}) {
  return useQuery<PaginatedTasks>({
    queryKey: ['tasks', filters],
    queryFn: () => (filters?.debts ? getDebts(filters) : getTasks(filters)).then(res => res.data),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskData: Omit<Task, "id" | "created_at" | "updated_at">) => createTask(taskData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Record<string, any> }) => apiUpdateTask(id, updates).then(res => res.data),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['inProgressTasks'] });
      await queryClient.cancelQueries({ queryKey: ['completedTasks'] });
      await queryClient.cancelQueries({ queryKey: ['task', id] });

      // Snapshot the previous values
      const previousInProgressTasks = queryClient.getQueriesData({ queryKey: ['inProgressTasks'] });
      const previousCompletedTasks = queryClient.getQueriesData({ queryKey: ['completedTasks'] });
      const previousTask = queryClient.getQueryData(['task', id]);

      // Optimistically update the single task
      if (previousTask) {
        queryClient.setQueryData(['task', id], (old: any) => ({ ...old, ...updates }));
      }

      // If status is being changed, optimistically update the lists
      if (updates.status) {
        // Remove from in-progress lists if status is changing away from "In Progress"
        queryClient.setQueriesData({ queryKey: ['inProgressTasks'] }, (old: Task[] | undefined) => {
          if (!old) return old;
          if (updates.status !== 'In Progress') {
            return old.filter(task => task.title !== id);
          }
          return old;
        });

        // Add to completed lists if status is changing to "Completed"
        if (updates.status === 'Completed') {
          queryClient.setQueriesData({ queryKey: ['completedTasks'] }, (old: Task[] | undefined) => {
            if (!old) return old;
            const taskToAdd = previousTask as Task;
            if (taskToAdd && !old.some(t => t.title === id)) {
              return [{ ...taskToAdd, ...updates }, ...old];
            }
            return old;
          });
        }
      }

      // Return context with previous values for rollback
      return { previousInProgressTasks, previousCompletedTasks, previousTask };
    },
    onError: (err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousInProgressTasks) {
        context.previousInProgressTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousCompletedTasks) {
        context.previousCompletedTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousTask) {
        queryClient.setQueryData(['task', variables.id], context.previousTask);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['inProgressTasks'] });
      queryClient.invalidateQueries({ queryKey: ['completedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['inWorkshopTasks'] });
      queryClient.invalidateQueries({ queryKey: ['technicianHistoryTasks'] });
    },
  });
}

export function useCreateCostBreakdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, costBreakdown }: { taskId: string, costBreakdown: any }) => createCostBreakdown(taskId, costBreakdown),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
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
    enabled: !!userId,
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
