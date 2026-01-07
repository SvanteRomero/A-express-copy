"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getTask, createTask, updateTask as apiUpdateTask, createCostBreakdown, getDebts } from '@/lib/api-client'
import { getTaskStatusOptions, getTaskUrgencyOptions } from '@/lib/tasks-api'
import { Task, PaginatedTasks } from '@/components/tasks/types'

export function useTasks(filters?: {
  status?: string
  technician?: string
  search?: string
  page?: number
  updated_at_after?: string
  debts?: boolean
  template_filter?: string
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
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Task> }) => apiUpdateTask(id, updates).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
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
