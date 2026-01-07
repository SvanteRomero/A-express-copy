"use client";

import { useState, useEffect, useMemo } from "react";
import { MessageTemplate, Customer } from "./types";
import { transformTasksToCustomers } from "./utils";
import { useTasks } from "@/hooks/use-tasks";
import { getMessageTemplates, sendBulkSMS } from "@/lib/api-client";
import { useComposeState } from "@/hooks/use-compose-state";
import {
    TemplateSelector,
    RecipientsList,
    PreviewModal,
    PhoneSelectDialog,
} from "./compose";

const ITEMS_PER_PAGE = 20;

export function ComposeView() {
    // Template & Message State
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [customMessage, setCustomMessage] = useState("");
    const [useCustomMessage, setUseCustomMessage] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);

    // Search & Pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // UI State
    const [loading, setLoading] = useState(false);
    const [managementTarget, setManagementTarget] = useState<Customer | null>(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);

    // Selection State (via custom hook)
    const {
        selectedTaskIds,
        selectedCustomersData,
        selectedCustomers,
        toggleCustomer,
        clearSelections,
        updateCustomerPhone,
        updateSingleCustomerPhone,
        getGroupedSelectedCustomers,
    } = useComposeState();

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Derive template_filter from selected template
    const currentTemplate = templates.find(t => t.id.toString() === selectedTemplate);

    const templateFilter = useMemo(() => {
        if (!currentTemplate || useCustomMessage) return undefined;
        const name = currentTemplate.name.toLowerCase();
        if (name.includes("ready for pickup")) return "ready_for_pickup";
        if (name.includes("repair in progress")) return "repair_in_progress";
        if (name.includes("remind debt") || name.includes("deni")) return "debt_reminder";
        return undefined;
    }, [currentTemplate, useCustomMessage]);

    // Fetch tasks with server-side pagination and filtering
    const { data: tasksData, isLoading: tasksLoading } = useTasks({
        page: currentPage,
        search: debouncedSearch || undefined,
        template_filter: templateFilter,
    });

    // Fetch Templates
    useEffect(() => {
        getMessageTemplates()
            .then(data => {
                setTemplates(data);
                if (data.length > 0) {
                    const firstValid = data.find((t: MessageTemplate) => t.name !== "General (Custom)");
                    if (firstValid) setSelectedTemplate(firstValid.id.toString());
                }
            })
            .catch(err => console.error("Failed to fetch templates:", err));
    }, []);

    // Reset selections when template changes
    useEffect(() => {
        clearSelections();
        setCurrentPage(1);
    }, [selectedTemplate, useCustomMessage, clearSelections]);

    // Transform tasks to customers
    const displayedCustomers = useMemo(() => {
        if (!tasksData?.results) return [];
        return transformTasksToCustomers(tasksData.results, selectedTaskIds);
    }, [tasksData, selectedTaskIds]);

    const totalCount = tasksData?.count || 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Handlers
    const handleToggleCustomMessage = (checked: boolean) => {
        setUseCustomMessage(checked);
        if (!checked) {
            setCustomMessage("");
            if (!selectedTemplate && templates.length > 0) {
                const firstValid = templates.find(t => t.name !== "General (Custom)");
                if (firstValid) setSelectedTemplate(firstValid.id.toString());
            }
        }
    };

    const handlePreview = () => {
        if (!selectedCustomers.length) return;
        if (useCustomMessage && customMessage.includes('\n')) {
            alert("Warning: SMS cannot contain line breaks. They will be removed.");
        }
        setPreviewModalOpen(true);
    };

    const handleConfirmSend = async () => {
        setPreviewModalOpen(false);
        await handleSend(true);
    };

    const handleSend = async (confirmed = false) => {
        if (!selectedCustomers.length) return;

        if (!confirmed) {
            handlePreview();
            return;
        }

        setLoading(true);

        try {
            const payload = {
                recipients: selectedCustomers.map(c => ({
                    task_id: c.taskId.toString(),
                    phone: c.selectedPhone
                })),
                message: useCustomMessage ? customMessage : undefined,
                template_id: useCustomMessage ? undefined : Number(selectedTemplate)
            };

            const data = await sendBulkSMS(payload);

            if (data.success) {
                alert(`Success: ${data.summary.sent} sent, ${data.summary.failed} failed.`);
                clearSelections();
                setCustomMessage("");
                setSelectedTemplate("");
                setUseCustomMessage(false);
            } else {
                alert(`Error: ${data.error || 'Failed to send messages'}`);
            }
        } catch (error) {
            alert("An error occurred while sending messages.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSelect = (taskId: number, phone: string) => {
        if (selectedCustomersData.has(taskId)) {
            updateSingleCustomerPhone(taskId, phone);
        }
    };

    const canSelect = !!selectedTemplate || useCustomMessage;

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                    <TemplateSelector
                        templates={templates}
                        selectedTemplate={selectedTemplate}
                        onSelectTemplate={setSelectedTemplate}
                        useCustomMessage={useCustomMessage}
                        onToggleCustom={handleToggleCustomMessage}
                        customMessage={customMessage}
                        onCustomMessageChange={setCustomMessage}
                    />

                    <RecipientsList
                        customers={displayedCustomers}
                        selectedTaskIds={selectedTaskIds}
                        selectedCount={selectedCustomers.length}
                        onToggleCustomer={toggleCustomer}
                        canSelect={canSelect}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        isLoading={tasksLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        onPageChange={setCurrentPage}
                        onManagePhone={setManagementTarget}
                        onSendClick={() => handleSend(false)}
                        isSending={loading}
                    />
                </div>
            </div>

            <PreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                groupedCustomers={getGroupedSelectedCustomers()}
                templates={templates}
                selectedTemplate={selectedTemplate}
                useCustomMessage={useCustomMessage}
                customMessage={customMessage}
                onUpdateCustomerPhone={updateCustomerPhone}
                onConfirm={handleConfirmSend}
                loading={loading}
                totalCount={selectedCustomers.length}
            />

            <PhoneSelectDialog
                customer={managementTarget}
                onClose={() => setManagementTarget(null)}
                onSelectPhone={handlePhoneSelect}
            />
        </div>
    );
}
