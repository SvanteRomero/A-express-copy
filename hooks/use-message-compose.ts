"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomerForMessaging, TaskForMessaging } from "@/components/messaging/types";
import { getCustomersForMessaging } from "@/lib/api-client";

export interface UseComposeStateReturn {
    // Data fetching
    customers: CustomerForMessaging[];
    isLoading: boolean;
    totalCount: number;
    totalPages: number;

    // Selection state
    selectedTaskIds: Set<number>;
    selectedCustomersData: Map<number, CustomerForMessaging>;

    // Selection actions
    toggleTask: (customerId: number, task: TaskForMessaging) => void;
    toggleAllTasksForCustomer: (customer: CustomerForMessaging) => void;
    isTaskSelected: (taskId: number) => boolean;
    isCustomerFullySelected: (customer: CustomerForMessaging) => boolean;
    isCustomerPartiallySelected: (customer: CustomerForMessaging) => boolean;
    clearSelections: () => void;

    // Phone management
    updateCustomerPhone: (customerId: number, newPhone: string) => void;
    getCustomerPhone: (customerId: number) => string;

    // For preview modal
    getSelectedForSending: () => { customerId: number; name: string; phone: string; tasks: TaskForMessaging[] }[];
    getSelectedTaskCount: () => number;
}

export function useComposeState(params: {
    templateFilter?: string;
    search?: string;
    page?: number;
}): UseComposeStateReturn {
    // Selection state - track by task ID
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    // Track customer data for selected tasks (keyed by customerId)
    const [selectedCustomersData, setSelectedCustomersData] = useState<Map<number, CustomerForMessaging>>(new Map());
    // Track selected phone per customer
    const [customerPhones, setCustomerPhones] = useState<Map<number, string>>(new Map());

    // Fetch customers with their filtered tasks
    const { data, isLoading } = useQuery({
        queryKey: ['customersForMessaging', params.templateFilter, params.search, params.page],
        queryFn: () => getCustomersForMessaging({
            template_filter: params.templateFilter,
            search: params.search,
            page: params.page,
        }),
        enabled: !!params.templateFilter,
    });

    const customers: CustomerForMessaging[] = useMemo(() => {
        return data?.results || [];
    }, [data]);

    const totalCount = data?.count || 0;
    const totalPages = Math.ceil(totalCount / 10);

    // Toggle a single task selection
    const toggleTask = useCallback((customerId: number, task: TaskForMessaging) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(task.taskId)) {
                newSet.delete(task.taskId);
            } else {
                newSet.add(task.taskId);
            }
            return newSet;
        });

        // Update customer data map
        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            const customer = customers.find(c => c.customerId === customerId);
            if (customer) {
                newMap.set(customerId, customer);
            }
            return newMap;
        });
    }, [customers]);

    // Toggle all tasks for a customer
    const toggleAllTasksForCustomer = useCallback((customer: CustomerForMessaging) => {
        const customerTaskIds = customer.tasks.map(t => t.taskId);
        const allSelected = customerTaskIds.every(id => selectedTaskIds.has(id));

        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (allSelected) {
                // Deselect all
                customerTaskIds.forEach(id => newSet.delete(id));
            } else {
                // Select all
                customerTaskIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });

        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            newMap.set(customer.customerId, customer);
            return newMap;
        });
    }, [selectedTaskIds]);

    const isTaskSelected = useCallback((taskId: number) => {
        return selectedTaskIds.has(taskId);
    }, [selectedTaskIds]);

    const isCustomerFullySelected = useCallback((customer: CustomerForMessaging) => {
        return customer.tasks.length > 0 && customer.tasks.every(t => selectedTaskIds.has(t.taskId));
    }, [selectedTaskIds]);

    const isCustomerPartiallySelected = useCallback((customer: CustomerForMessaging) => {
        const selectedCount = customer.tasks.filter(t => selectedTaskIds.has(t.taskId)).length;
        return selectedCount > 0 && selectedCount < customer.tasks.length;
    }, [selectedTaskIds]);

    const clearSelections = useCallback(() => {
        setSelectedTaskIds(new Set());
        setSelectedCustomersData(new Map());
        setCustomerPhones(new Map());
    }, []);

    // Phone management
    const updateCustomerPhone = useCallback((customerId: number, newPhone: string) => {
        setCustomerPhones(prev => {
            const newMap = new Map(prev);
            newMap.set(customerId, newPhone);
            return newMap;
        });
    }, []);

    const getCustomerPhone = useCallback((customerId: number) => {
        // Return selected phone or first available
        const selected = customerPhones.get(customerId);
        if (selected) return selected;

        const customer = customers.find(c => c.customerId === customerId) ||
            selectedCustomersData.get(customerId);
        return customer?.phoneNumbers[0] || '';
    }, [customerPhones, customers, selectedCustomersData]);

    // Get all selected data formatted for sending
    const getSelectedForSending = useCallback(() => {
        const result: { customerId: number; name: string; phone: string; phoneNumbers: string[]; tasks: TaskForMessaging[] }[] = [];

        // Group selected tasks by customer
        const customerTasksMap = new Map<number, TaskForMessaging[]>();

        for (const customer of [...selectedCustomersData.values(), ...customers]) {
            const selectedTasks = customer.tasks.filter(t => selectedTaskIds.has(t.taskId));
            if (selectedTasks.length > 0 && !customerTasksMap.has(customer.customerId)) {
                customerTasksMap.set(customer.customerId, selectedTasks);
                result.push({
                    customerId: customer.customerId,
                    name: customer.name,
                    phone: getCustomerPhone(customer.customerId),
                    phoneNumbers: customer.phoneNumbers || [],
                    tasks: selectedTasks,
                });
            }
        }

        return result;
    }, [selectedTaskIds, selectedCustomersData, customers, getCustomerPhone]);

    const getSelectedTaskCount = useCallback(() => {
        return selectedTaskIds.size;
    }, [selectedTaskIds]);

    return {
        customers,
        isLoading,
        totalCount,
        totalPages,
        selectedTaskIds,
        selectedCustomersData,
        toggleTask,
        toggleAllTasksForCustomer,
        isTaskSelected,
        isCustomerFullySelected,
        isCustomerPartiallySelected,
        clearSelections,
        updateCustomerPhone,
        getCustomerPhone,
        getSelectedForSending,
        getSelectedTaskCount,
    };
}
