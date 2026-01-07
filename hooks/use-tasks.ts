"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, createTask, updateTask as apiUpdateTask, createCostBreakdown, getDebts } from '@/lib/api-client'
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
