"use client";

import { useState, useCallback, useMemo } from "react";
import { Customer } from "@/components/messaging/types";

export interface UseComposeStateReturn {
    selectedTaskIds: Set<number>;
    selectedCustomersData: Map<number, Customer>;
    selectedCustomers: Customer[];
    toggleCustomer: (customer: Customer) => void;
    clearSelections: () => void;
    updateCustomerPhone: (customerId: string, newPhone: string) => void;
    updateSingleCustomerPhone: (taskId: number, newPhone: string) => void;
    getGroupedSelectedCustomers: () => Record<string, Customer[]>;
}

export function useComposeState(): UseComposeStateReturn {
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    const [selectedCustomersData, setSelectedCustomersData] = useState<Map<number, Customer>>(new Map());

    const selectedCustomers = useMemo(() => {
        return Array.from(selectedCustomersData.values());
    }, [selectedCustomersData]);

    const toggleCustomer = useCallback((customer: Customer) => {
        const taskId = customer.taskId;
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });

        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            if (newMap.has(taskId)) {
                newMap.delete(taskId);
            } else {
                newMap.set(taskId, customer);
            }
            return newMap;
        });
    }, []);

    const clearSelections = useCallback(() => {
        setSelectedTaskIds(new Set());
        setSelectedCustomersData(new Map());
    }, []);

    const updateCustomerPhone = useCallback((customerId: string, newPhone: string) => {
        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            newMap.forEach((customer, taskId) => {
                if (customer.customerId === customerId || (!customer.customerId && `unknown-${customer.id}` === customerId)) {
                    newMap.set(taskId, { ...customer, selectedPhone: newPhone });
                }
            });
            return newMap;
        });
    }, []);

    const updateSingleCustomerPhone = useCallback((taskId: number, newPhone: string) => {
        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            const customer = newMap.get(taskId);
            if (customer) {
                newMap.set(taskId, { ...customer, selectedPhone: newPhone });
            }
            return newMap;
        });
    }, []);

    const getGroupedSelectedCustomers = useCallback(() => {
        const groups: Record<string, Customer[]> = {};
        selectedCustomers.forEach(c => {
            const key = c.customerId || `unknown-${c.id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        return groups;
    }, [selectedCustomers]);

    return {
        selectedTaskIds,
        selectedCustomersData,
        selectedCustomers,
        toggleCustomer,
        clearSelections,
        updateCustomerPhone,
        updateSingleCustomerPhone,
        getGroupedSelectedCustomers,
    };
}
