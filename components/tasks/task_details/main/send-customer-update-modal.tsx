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
import { useToast } from "@/hooks/use-toast"
import { sendCustomerSMS } from "@/lib/api-client"

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
    // New props for Swahili templates
    brand?: string
    model?: string
    description?: string
    totalCost?: string
    deviceNotes?: string
}

// Status translation map
const STATUS_SWAHILI: Record<string, string> = {
    "Ready for Pickup": "Tayari Kuchukuliwa",
    "In Progress": "Inarekebishwa",
    "Diagnostic": "Uchunguzi",
    "Awaiting Parts": "Inasubiri Vipuri",
    "Completed": "Imekamilika",
    "Assigned - Not Accepted": "Haijakubaliwa",
}

// Build the template message
function buildSwahiliTemplate(
    templateId: string,
    data: {
        customerName: string
        taskTitle: string
        brand?: string
        model?: string
        description?: string
        totalCost?: string
        deviceNotes?: string
        statusSwahili: string
    }
): string {
    const deviceInfo = [data.brand, data.model].filter(Boolean).join(" ")
    const cost = data.totalCost ? `${parseFloat(data.totalCost).toLocaleString()}/=` : "-"
    const notes = data.deviceNotes?.trim() ? ` | Maelezo: ${data.deviceNotes.trim()}` : ""
    const inquiry = "Kwa maelezo zaidi piga: 0745869216"

    if (templateId === "ready_pickup") {
        return `Habari ${data.customerName} | Kazi: ${data.taskTitle} | Kifaa: ${deviceInfo || "-"} | Tatizo: ${data.description || "-"} | Gharama: ${cost} | Hali: TAYARI KUCHUKULIWA${notes} | ${inquiry} - A-Express`
    }

    if (templateId === "repair_in_progress") {
        return `Habari ${data.customerName} | Kazi: ${data.taskTitle} | Kifaa: ${deviceInfo || "-"} | Tatizo: ${data.description || "-"} | Gharama: ${cost} | Hali: INAREKEBISHWA${notes} | ${inquiry} - A-Express`
    }

    return ""
}

// Message templates
const MESSAGE_TEMPLATES = [
    { id: "custom", label: "Custom Message" },
    { id: "ready_pickup", label: "Tayari Kuchukuliwa (Ready for Pickup)" },
    { id: "repair_in_progress", label: "Inarekebishwa (Repair In Progress)" },
]

export function SendCustomerUpdateModal({
    isOpen,
    onClose,
    taskId,
    customerName,
    phoneNumbers,
    taskTitle,
    taskStatus,
    brand,
    model,
    description,
    totalCost,
    deviceNotes,
}: SendCustomerUpdateModalProps) {
    const [selectedPhone, setSelectedPhone] = useState<string>(phoneNumbers[0]?.phone_number || "")
    const [selectedTemplate, setSelectedTemplate] = useState<string>("custom")
    const [message, setMessage] = useState<string>("")
    const [isSending, setIsSending] = useState(false)
    const { toast } = useToast()

    // Character count for SMS (160 chars per segment)
    const charCount = message.length
    const smsSegments = Math.ceil(charCount / 160) || 1

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplate(templateId)

        if (templateId === "custom") {
            setMessage("")
            return
        }

        const statusSwahili = STATUS_SWAHILI[taskStatus] || taskStatus
        const filledMessage = buildSwahiliTemplate(templateId, {
            customerName,
            taskTitle,
            brand,
            model,
            description,
            totalCost,
            deviceNotes,
            statusSwahili,
        })
        setMessage(filledMessage)
    }

    const handleSend = async () => {
        if (!message.trim()) {
            toast({
                title: "Message Required",
                description: "Please enter a message to send.",
                variant: "destructive",
            })
            return
        }

        if (!selectedPhone) {
            toast({
                title: "Phone Number Required",
                description: "Please select a phone number to send the message to.",
                variant: "destructive",
            })
            return
        }

        setIsSending(true)

        try {
            await sendCustomerSMS(taskId, {
                phone_number: selectedPhone,
                message: message.trim(),
            })

            toast({
                title: "Message Sent!",
                description: `Customer update sent to ${selectedPhone}`,
            })

            // Reset and close
            setMessage("")
            setSelectedTemplate("custom")
            onClose()
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || "Failed to send SMS"
            toast({
                title: "Failed to Send",
                description: errorMessage,
                variant: "destructive",
            })
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
                            <SelectTrigger id="template">
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
                        <Textarea
                            id="message"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                            className="resize-none font-mono text-sm"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSending}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleSend}
                        disabled={isSending || !message.trim()}
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
