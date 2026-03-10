'use client';

/**
 * Notification Preferences Context Provider.
 * Stores per-category toast visibility and sound toggles in localStorage.
 * Each category has: enabled (show/hide toasts) + sound (play notification sound).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { registerSoundChecker } from '@/hooks/use-toast';

// ── Category definitions ──

export const NOTIFICATION_CATEGORIES = {
    task: {
        label: 'Task Notifications',
        description: 'New tasks, task updates, assignments, and terminations',
        toastTypes: ['task_created', 'task_updated', 'task_assigned', 'task_terminated'],
    },
    approval: {
        label: 'Approval Notifications',
        description: 'Task approved (ready for pickup) and task picked up',
        toastTypes: ['task_approved', 'task_picked_up'],
    },
    workshop: {
        label: 'Workshop Notifications',
        description: 'Workshop task status changes, verifications, and disputes',
        toastTypes: [
            'task_sent_to_workshop', 'task_completed',
            'workshop_task_solved', 'workshop_task_not_solved',
            'workshop_outcome_to_verify', 'workshop_outcome_disputed', 'workshop_outcome_confirmed',
        ],
    },
    financial: {
        label: 'Financial Notifications',
        description: 'Payments added and payment method changes',
        toastTypes: ['payment_added', 'payment_method_created', 'payment_method_updated', 'payment_method_deleted'],
    },
    requests: {
        label: 'Approval Requests',
        description: 'Interactive transaction and debt request approval toasts',
        toastTypes: [
            'transaction_request', 'transaction_request_approved', 'transaction_request_rejected',
            'debt_request', 'debt_request_approved', 'debt_request_rejected',
        ],
    },
    scheduler: {
        label: 'Scheduler Notifications',
        description: 'Automated pickup and debt reminder job results',
        toastTypes: ['pickup_reminder', 'debt_reminder'],
    },
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

// ── Preference types ──

export interface CategoryPreference {
    enabled: boolean;
    sound: boolean;
}

export type NotificationPreferences = Record<NotificationCategory, CategoryPreference>;

// ── Defaults ──

const DEFAULT_PREFERENCES: NotificationPreferences = {
    task: { enabled: true, sound: false },
    approval: { enabled: true, sound: false },
    workshop: { enabled: true, sound: false },
    financial: { enabled: true, sound: false },
    requests: { enabled: true, sound: true },
    scheduler: { enabled: true, sound: false },
};

const STORAGE_KEY = 'notification-preferences';

// ── Module-level accessor for non-React code (use-toast.ts, websocket-toasts.ts) ──

let _currentPreferences: NotificationPreferences = DEFAULT_PREFERENCES;

export function getNotificationPreferences(): NotificationPreferences {
    return _currentPreferences;
}

export function getCategoryForToastType(toastType: string): NotificationCategory | null {
    for (const [category, config] of Object.entries(NOTIFICATION_CATEGORIES)) {
        if ((config.toastTypes as readonly string[]).includes(toastType)) {
            return category as NotificationCategory;
        }
    }
    return null;
}

export function isToastEnabled(toastType: string): boolean {
    const category = getCategoryForToastType(toastType);
    if (!category) return true; // Unknown types always show
    return _currentPreferences[category].enabled;
}

export function shouldPlaySoundForToastType(toastType: string): boolean {
    const category = getCategoryForToastType(toastType);
    if (!category) return false;
    return _currentPreferences[category].enabled && _currentPreferences[category].sound;
}

// ── React Context ──

interface NotificationPreferencesContextType {
    preferences: NotificationPreferences;
    updateCategoryPreference: (
        category: NotificationCategory,
        field: keyof CategoryPreference,
        value: boolean
    ) => void;
    resetToDefaults: () => void;
}

const NotificationPreferencesContext = createContext<NotificationPreferencesContextType | undefined>(undefined);

function loadPreferences(): NotificationPreferences {
    if (globalThis.window === undefined) return DEFAULT_PREFERENCES;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle new categories added later
            const merged = { ...DEFAULT_PREFERENCES };
            for (const key of Object.keys(DEFAULT_PREFERENCES) as NotificationCategory[]) {
                if (parsed[key]) {
                    merged[key] = { ...DEFAULT_PREFERENCES[key], ...parsed[key] };
                }
            }
            return merged;
        }
    } catch {
        // Corrupted localStorage — use defaults
    }
    return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: NotificationPreferences) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // Quota exceeded or private browsing
    }
}

export function NotificationPreferencesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

    // Load from localStorage on mount and register sound checker
    useEffect(() => {
        const loaded = loadPreferences();
        setPreferences(loaded);
        _currentPreferences = loaded;

        // Register sound checker callback with use-toast (replaces require()-based approach)
        registerSoundChecker(shouldPlaySoundForToastType);
    }, []);

    const updateCategoryPreference = useCallback((
        category: NotificationCategory,
        field: keyof CategoryPreference,
        value: boolean
    ) => {
        setPreferences(prev => {
            const next = {
                ...prev,
                [category]: { ...prev[category], [field]: value },
            };
            savePreferences(next);
            _currentPreferences = next;
            return next;
        });
    }, []);

    const resetToDefaults = useCallback(() => {
        setPreferences(DEFAULT_PREFERENCES);
        savePreferences(DEFAULT_PREFERENCES);
        _currentPreferences = DEFAULT_PREFERENCES;
    }, []);

    const contextValue = useMemo(() => ({ preferences, updateCategoryPreference, resetToDefaults }), [preferences, updateCategoryPreference, resetToDefaults]);

    return (
        <NotificationPreferencesContext.Provider value={contextValue}>
            {children}
        </NotificationPreferencesContext.Provider>
    );
}

export function useNotificationPreferences() {
    const context = useContext(NotificationPreferencesContext);
    if (!context) {
        throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
    }
    return context;
}
