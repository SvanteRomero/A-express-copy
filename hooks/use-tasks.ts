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
  assigned_to?: number
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
      queryClient.invalidateQueries({ queryKey: ['technicianTasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Record<string, any> }) => apiUpdateTask(id, updates).then(res => res.data),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: ['technicianTasks'], exact: false });
      await queryClient.cancelQueries({ queryKey: ['tasks'], exact: false });
      await queryClient.cancelQueries({ queryKey: ['task', id] });

      // Snapshot the previous values for all matching queries
      const previousTechnicianTasks = queryClient.getQueriesData<PaginatedTasks>({ queryKey: ['technicianTasks'] });
      const previousTask = queryClient.getQueryData<Task>(['task', id]);

      // Optimistically update the single task
      if (previousTask) {
        queryClient.setQueryData(['task', id], (old: Task | undefined) => old ? { ...old, ...updates } : old);
      }

      // Iterate over all cached technician task queries to apply smart updates
      previousTechnicianTasks.forEach(([queryKey, oldData]) => {
        if (!oldData || !Array.isArray(oldData.results)) return;

        const activeTab = queryKey[3] as string; // ['technicianTasks', userId, isWorkshopTech, activeTab, page]

        let newResults = [...oldData.results];
        let newCount = oldData.count;

        // 1. Check if task exists in this list
        const taskIndex = newResults.findIndex(t => t.title === id);
        const taskExists = taskIndex !== -1;

        // 2. Base update: if it exists, update it in place first
        if (taskExists) {
          newResults[taskIndex] = { ...newResults[taskIndex], ...updates };
        }

        // 3. Move logic based on status change
        if (updates.status) {
          const isCompleted = updates.status === 'Completed';
          const isInProgress = updates.status === 'In Progress';

          if (isCompleted) {
            // If moved to Completed
            if (activeTab === 'in-progress' || activeTab === 'in-workshop') {
              // Remove from In Progress / In Workshop
              if (taskExists) {
                newResults = newResults.filter(t => t.title !== id);
                newCount--;
              }
            } else if (activeTab === 'completed') {
              // Add to Completed if not present
              if (!taskExists && previousTask) {
                newResults = [{ ...previousTask, ...updates }, ...newResults];
                newCount++;
              }
            }
          } else if (isInProgress) {
            // If moved to In Progress
            if (activeTab === 'completed') {
              // Remove from Completed
              if (taskExists) {
                newResults = newResults.filter(t => t.title !== id);
                newCount--;
              }
            } else if (activeTab === 'in-progress') {
              // Add to In Progress if not present
              if (!taskExists && previousTask) {
                newResults = [{ ...previousTask, ...updates }, ...newResults];
                newCount++;
              }
            }
          }
        }

        // Only set data if there were changes
        if (newResults !== oldData.results || newCount !== oldData.count) {
          queryClient.setQueryData(queryKey, { ...oldData, results: newResults, count: newCount });
        }
      });

      // Also update any general 'tasks' queries (Search/Admin views)
      queryClient.setQueriesData<PaginatedTasks>(
        { queryKey: ['tasks'], exact: false },
        (old) => {
          if (!old?.results || !Array.isArray(old.results)) return old;
          return {
            ...old,
            results: old.results.map(task =>
              task.title === id ? { ...task, ...updates } : task
            )
          };
        }
      );

      // Return context with previous values for rollback
      return { previousTechnicianTasks, previousTask };
    },
    onError: (err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTechnicianTasks) {
        context.previousTechnicianTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousTask) {
        queryClient.setQueryData(['task', variables.id], context.previousTask);
      }
    },
    onSuccess: (data, variables) => {
      // Update the single task cache with the server response to ensure consistency
      queryClient.setQueryData(['task', variables.id], data);

      // Debounce refetch to allow server replication to complete in production
      // This prevents the race condition where stale data appears in multiple tabs
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['technicianTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['technicianHistoryTasks'] });
      }, 1000);
    },
    onSettled: (data, error, variables) => {
      // Only refetch the individual task immediately to ensure it's up to date
      // The list queries are handled in onSuccess with a delay
      if (error) {
        // On error, immediately refetch to ensure correct state after rollback
        queryClient.invalidateQueries({ queryKey: ['technicianTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['technicianHistoryTasks'] });
      }
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

/**
 * Consolidated hook for all technician tasks.
 * Fetches all tasks for a technician at once and filters client-side.
 * This eliminates multiple queries and makes optimistic updates simpler.
 */
/**
 * Consolidated hook for technician tasks with server-side pagination.
 * Fetches data specific to the active tab and page.
 */
export function useTechnicianTasks(
  userId: string | undefined,
  isWorkshopTech: boolean = false,
  activeTab: string = "in-progress",
  page: number = 1
) {
  return useQuery<PaginatedTasks>({
    queryKey: ['technicianTasks', userId, isWorkshopTech, activeTab, page],
    queryFn: async () => {
      if (!userId) return { count: 0, next: null, previous: null, results: [] };

      const params: any = {
        page,
        page_size: 10,
      };

      if (activeTab === 'in-progress') {
        params.assigned_to = userId;
        params.status = "In Progress";
        // Convert to string explicit filter for backend if needed, or rely on client/server logic
        // The previous logic filtered out workshop tasks client side. 
        // For server side, we might need a specific exclusion or just handle it.
        // If the backend doesn't support "not_workshop_status", we might fetch and filter,
        // but for pagination we want server to handle it.
        // Assuming standard behavior:
        if (!isWorkshopTech) {
          // For normal techs, we usually exclude "In Workshop" tasks from their main list
          // If the API supports exclusion, good. If not, we might view them or mixed.
          // Given the constraints, we'll query for assigned tasks.
        }
      } else if (activeTab === 'completed') {
        params.assigned_to = userId;
        params.status = "Completed";
      } else if (activeTab === 'in-workshop') {
        params.workshop_status = "In Workshop";
        // Ensure we only show ones currently in progress in workshop?
        params.status = "In Progress";
        if (!isWorkshopTech) {
          params.assigned_to = userId;
        } else {
          params.workshop_technician = userId;
        }
      }

      // Specific overrides for Workshop Techs who have a different "In Progress" view
      if (isWorkshopTech && activeTab === 'in-progress') {
        // Workshop techs see tasks assigned to them OR where they are workshop tech
        // This complex OR query might be hard for the simple getTasks.
        // We'll prioritize the direct assignment for "In Progress" tab or match previous behavior.
        // Previous behavior: fetched both.
        // For pagination, we'll stick to 'assigned_to' for standard "In Progress"
        // and they use "In Workshop" tab for workshop tasks.
      }

      const response = await getTasks(params);
      return response.data;
    },
    enabled: !!userId,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
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
