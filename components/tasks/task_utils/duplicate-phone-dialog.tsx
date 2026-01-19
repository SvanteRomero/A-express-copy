import { AlertTriangle } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/feedback/alert-dialog"

interface DuplicatePhoneDialogProps {
    isOpen: boolean
    phone: string
    customerName: string
    onClose: () => void
}

/**
 * Alert dialog shown when a phone number already belongs to another customer
 */
export function DuplicatePhoneDialog({
    isOpen,
    phone,
    customerName,
    onClose,
}: DuplicatePhoneDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Phone Number Already Exists
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        The phone number <strong>{phone}</strong> already belongs to another customer: <strong>{customerName}</strong>.
                        <br /><br />
                        Please use a different phone number or select the existing customer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onClose}>
                        OK
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
