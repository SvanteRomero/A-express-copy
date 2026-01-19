'use client'

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/feedback/dialog"
import { Button } from "@/components/ui/core/button"
import { Textarea } from "@/components/ui/core/textarea"
import { Label } from "@/components/ui/core/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { MessageSquare, Send, Loader2 } from "lucide-react"
import {
    showCustomerUpdateSentToast,
    showCustomerUpdateFailedToast,
    showMessageRequiredToast,
    showPhoneRequiredToast,
    showPreviewFailedToast,
} from "@/components/notifications/toast"
import { sendCustomerSMS, previewTemplateMessage } from "@/lib/api-client"

interface PhoneNumber {
    id: number
    phone_number: string
}

interface SendCustomerUpdateModalProps {
    isOpen: boolean
    onClose: () => void
    taskId: string
    customerName: string
    phoneNumbers: PhoneNumber[]
    taskTitle: string
    taskStatus: string
    brand?: string
    model?: string
    description?: string
    totalCost?: string
    deviceNotes?: string
    workshopStatus?: string
}

// Message templates - now map to backend template keys
const MESSAGE_TEMPLATES = [
    { id: "custom", label: "Custom Message", backendKey: null },
    { id: "ready_for_pickup", label: "Tayari Kuchukuliwa (Ready for Pickup)", backendKey: "ready_for_pickup" },
    { id: "in_progress", label: "Inarekebishwa (Repair In Progress)", backendKey: "in_progress" },
]

export function SendCustomerUpdateModal({
    isOpen,
    onClose,
    taskId,
    customerName,
    phoneNumbers,
    taskTitle,
}: SendCustomerUpdateModalProps) {
    const [selectedPhone, setSelectedPhone] = useState<string>(phoneNumbers[0]?.phone_number || "")
    const [selectedTemplate, setSelectedTemplate] = useState<string>("custom")
    const [message, setMessage] = useState<string>("")
    const [isSending, setIsSending] = useState(false)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    // Character count for SMS (160 chars per segment)
    const charCount = message.length
    const smsSegments = Math.ceil(charCount / 160) || 1

    const handleTemplateChange = async (templateId: string) => {
        setSelectedTemplate(templateId)

        if (templateId === "custom") {
            setMessage("")
            return
        }

        // Find the backend key for this template
        const template = MESSAGE_TEMPLATES.find(t => t.id === templateId)
        if (!template?.backendKey) {
            setMessage("")
            return
        }

        // Fetch preview from backend
        setIsLoadingPreview(true)
        try {
            const result = await previewTemplateMessage(taskId, template.backendKey)
            if (result.success && result.message) {
                setMessage(result.message)
            } else {
                showPreviewFailedToast(result.error)
                setMessage("")
            }
        } catch (error: any) {
            showPreviewFailedToast(error?.response?.data?.error)
            setMessage("")
        } finally {
            setIsLoadingPreview(false)
        }
    }

    const handleSend = async () => {
        if (!message.trim()) {
            showMessageRequiredToast()
            return
        }

        if (!selectedPhone) {
            showPhoneRequiredToast()
            return
        }

        setIsSending(true)

        try {
            await sendCustomerSMS(taskId, {
                phone_number: selectedPhone,
                message: message.trim(),
            })

            showCustomerUpdateSentToast(selectedPhone)

            // Reset and close
            setMessage("")
            setSelectedTemplate("custom")
            onClose()
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || "Failed to send SMS"
            showCustomerUpdateFailedToast(errorMessage)
        } finally {
            setIsSending(false)
        }
    }

    const handleClose = () => {
        if (!isSending) {
            setMessage("")
            setSelectedTemplate("custom")
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-red-600" />
                        Send Customer Update
                    </DialogTitle>
                    <DialogDescription>
                        Send an SMS update to <span className="font-semibold">{customerName}</span> regarding their device.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Phone Number Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Send to</Label>
                        <Select value={selectedPhone} onValueChange={setSelectedPhone}>
                            <SelectTrigger id="phone">
                                <SelectValue placeholder="Select phone number" />
                            </SelectTrigger>
                            <SelectContent>
                                {phoneNumbers.map((phone) => (
                                    <SelectItem key={phone.id} value={phone.phone_number}>
                                        {phone.phone_number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Message Template Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="template">Message Template</Label>
                        <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                            <SelectTrigger id="template" disabled={isLoadingPreview}>
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {MESSAGE_TEMPLATES.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                        {template.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="message">Message</Label>
                            <span className={`text-xs ${charCount > 160 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                {charCount} characters ({smsSegments} SMS segment{smsSegments > 1 ? "s" : ""})
                            </span>
                        </div>
                        {isLoadingPreview ? (
                            <div className="flex items-center justify-center h-[200px] border rounded-md bg-muted/50">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Textarea
                                id="message"
                                placeholder="Type your message here or select a template..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={8}
                                className="resize-none font-mono text-sm"
                            />
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSending}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleSend}
                        disabled={isSending || isLoadingPreview || !message.trim()}
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send SMS
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

