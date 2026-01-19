"use client";

import { useState, useEffect, useMemo } from "react";
import { MessageTemplate } from "./types";
import { getMessageTemplates, sendBulkSMS } from "@/lib/api-client";
import { useComposeState } from "@/hooks/use-message-compose";
import { useToast } from "@/hooks/use-toast";
import {
    TemplateSelector,
    RecipientsList,
    PreviewModal,
} from "./compose";

const ITEMS_PER_PAGE = 20;

export function ComposeView() {
    const { toast } = useToast();

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
    const [previewModalOpen, setPreviewModalOpen] = useState(false);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Derive template_filter from selected template
    const currentTemplate = templates.find(t =>
        (t.key && t.key === selectedTemplate) ||
        (t.id && t.id.toString() === selectedTemplate)
    );

    const templateFilter = useMemo(() => {
        // Custom message mode: use broadcast to get all customers
        if (useCustomMessage) return "broadcast";

        if (!currentTemplate) return undefined;

        const name = currentTemplate.name.toLowerCase();
        if (name.includes("ready for pickup")) return "ready_for_pickup";
        if (name.includes("repair in progress")) return "repair_in_progress";
        if (name.includes("remind debt") || name.includes("deni")) return "debt_reminder";

        // General/other templates: use broadcast mode
        return "broadcast";
    }, [currentTemplate, useCustomMessage]);

    // Use the compose state hook with data fetching
    const {
        customers,
        isLoading: customersLoading,
        totalCount,
        totalPages,
        selectedTaskIds,
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
    } = useComposeState({
        templateFilter,
        search: debouncedSearch || undefined,
        page: currentPage,
    });

    // Fetch Templates
    useEffect(() => {
        getMessageTemplates()
            .then(data => {
                setTemplates(data);
                if (data.length > 0) {
                    const firstValid = data.find((t: MessageTemplate) => t.name !== "General (Custom)");
                    if (firstValid) {
                        const val = firstValid.key || firstValid.id?.toString() || "";
                        setSelectedTemplate(val);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch templates:", err));
    }, []);

    // Reset selections when template changes
    useEffect(() => {
        clearSelections();
        setCurrentPage(1);
    }, [selectedTemplate, useCustomMessage, clearSelections]);

    // Handlers
    const handleToggleCustomMessage = (checked: boolean) => {
        setUseCustomMessage(checked);
        if (!checked) {
            setCustomMessage("");
            if (!selectedTemplate && templates.length > 0) {
                const firstValid = templates.find(t => t.name !== "General (Custom)");
                if (firstValid) {
                    const val = firstValid.key || firstValid.id?.toString() || "";
                    if (val) setSelectedTemplate(val);
                }
            }
        }
    };

    const handlePreview = () => {
        if (!getSelectedTaskCount()) return;
        if (useCustomMessage && customMessage.includes('\n')) {
            toast({
                title: "Line breaks removed",
                description: "SMS cannot contain line breaks. They have been automatically removed.",
                variant: "default",
            });
        }
        setPreviewModalOpen(true);
    };

    const handleConfirmSend = async () => {
        setPreviewModalOpen(false);
        await handleSend(true);
    };

    const handleSend = async (confirmed = false) => {
        const selectedCount = getSelectedTaskCount();
        if (!selectedCount) return;

        if (!confirmed) {
            handlePreview();
            return;
        }

        setLoading(true);

        try {
            const selectedData = getSelectedForSending();

            // Build recipients array - one entry per task
            const recipients: { task_id: string; phone: string }[] = [];
            for (const customer of selectedData) {
                for (const task of customer.tasks) {
                    recipients.push({
                        task_id: task.taskId.toString(),
                        phone: customer.phone,
                    });
                }
            }

            const payload = {
                recipients,
                message: useCustomMessage ? customMessage : undefined,
                template_key: (!useCustomMessage && currentTemplate?.is_default) ? currentTemplate.key : undefined,
                template_id: (!useCustomMessage && !currentTemplate?.is_default) ? currentTemplate?.id : undefined
            };

            const data = await sendBulkSMS(payload);

            if (data.success) {
                toast({
                    title: "Messages Sent",
                    description: `${data.summary.sent} messages sent successfully. ${data.summary.failed > 0 ? `${data.summary.failed} failed.` : ''}`,
                    variant: "default",
                });
                clearSelections();
                setCustomMessage("");
                setSelectedTemplate("");
                setUseCustomMessage(false);
            } else {
                toast({
                    title: "Send Failed",
                    description: data.error || 'Failed to send messages',
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred while sending messages.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setLoading(false);
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
                        customers={customers}
                        selectedTaskIds={selectedTaskIds}
                        selectedCount={getSelectedTaskCount()}
                        onToggleTask={toggleTask}
                        onToggleAllForCustomer={toggleAllTasksForCustomer}
                        isTaskSelected={isTaskSelected}
                        isCustomerFullySelected={isCustomerFullySelected}
                        isCustomerPartiallySelected={isCustomerPartiallySelected}
                        canSelect={canSelect}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        isLoading={customersLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        onPageChange={setCurrentPage}
                        onSendClick={() => handleSend(false)}
                        isSending={loading}
                        getCustomerPhone={getCustomerPhone}
                        onUpdateCustomerPhone={updateCustomerPhone}
                        isBroadcastMode={templateFilter === "broadcast"}
                    />
                </div>
            </div>

            <PreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                selectedData={getSelectedForSending()}
                templates={templates}
                selectedTemplate={selectedTemplate}
                useCustomMessage={useCustomMessage}
                customMessage={customMessage}
                onUpdateCustomerPhone={updateCustomerPhone}
                onConfirm={handleConfirmSend}
                loading={loading}
                totalCount={getSelectedTaskCount()}
            />
        </div>
    );
}
