
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/core/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/feedback/dialog"
import { Textarea } from "@/components/ui/core/textarea"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Loader2 } from "lucide-react"
import { previewTemplateMessage, sendCustomerSMS } from "@/lib/api-client"

interface NotifyCustomerDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    task: any
    onNotifyCustomer?: (taskTitle: string, customerName: string) => void
}

export function NotifyCustomerDialog({
    isOpen,
    onOpenChange,
    task,
    onNotifyCustomer
}: NotifyCustomerDialogProps) {
    const [notifyMessage, setNotifyMessage] = useState("")
    const [notifyPhone, setNotifyPhone] = useState("")
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [isSendingNotify, setIsSendingNotify] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadPreview()
        } else {
            // Reset state when closed? Optional
        }
    }, [isOpen])

    const loadPreview = async () => {
        setIsLoadingPreview(true)
        try {
            // Fetch preview for "ready_for_pickup"
            const response = await previewTemplateMessage(task.id, "ready_for_pickup")
            if (response.success) {
                setNotifyMessage(response.message)
                setNotifyPhone(response.phone || "")
            } else {
                setNotifyMessage("Error loading preview.")
            }
        } catch (error) {
            console.error("Failed to fetch preview:", error)
            setNotifyMessage("Failed to load message preview.")
        } finally {
            setIsLoadingPreview(false)
        }
    }

    const handleSendNotification = async () => {
        setIsSendingNotify(true)
        try {
            const response = await sendCustomerSMS(task.id, {
                phone_number: notifyPhone,
                message: notifyMessage
            })
            if (response.success) {
                alert("Message sent successfully!")
                onOpenChange(false)
                onNotifyCustomer?.(task.title, task.customer_details?.name || "")
            } else {
                alert("Failed to send message: " + (response.error || "Unknown error"))
            }
        } catch (error: any) {
            console.error("Failed to send SMS:", error)
            alert("Error sending SMS: " + (error.response?.data?.error || error.message))
        } finally {
            setIsSendingNotify(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Notify Customer - Ready for Pickup</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {isLoadingPreview ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={notifyPhone}
                                    onChange={(e) => setNotifyPhone(e.target.value)}
                                    placeholder="+255..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    value={notifyMessage}
                                    onChange={(e) => setNotifyMessage(e.target.value)}
                                    className="min-h-[120px]"
                                    placeholder="Message content..."
                                />
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter className="sm:justify-end">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSendingNotify}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleSendNotification}
                        disabled={isSendingNotify || isLoadingPreview}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSendingNotify && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Message
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
