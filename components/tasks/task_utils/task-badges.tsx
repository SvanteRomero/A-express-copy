import { Badge } from "@/components/ui/core/badge"

export function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "Assigned - Not Accepted":
            return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Not Accepted</Badge>
        case "Diagnostic":
            return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Diagnostic</Badge>
        case "In Progress":
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>
        case "Awaiting Parts":
            return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Awaiting Parts</Badge>
        case "Ready for Pickup":
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ready for Pickup</Badge>
        case "Completed":
            return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>
        default:
            return <Badge variant="secondary">{status}</Badge>
    }
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
    switch (urgency) {
        case "Yupo":
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yupo</Badge>
        case "Katoka kidogo":
            return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Katoka kidogo</Badge>
        case "Kaacha":
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Kaacha</Badge>
        case "Expedited":
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Expedited</Badge>
        case "Ina Haraka":
            return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Ina Haraka</Badge>
        default:
            return <Badge variant="secondary">{urgency}</Badge>
    }
}

export function PaymentStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "Fully Paid":
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Fully Paid</Badge>
        case "Partially Paid":
            return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partially Paid</Badge>
        case "Unpaid":
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid</Badge>
        default:
            return <Badge variant="secondary">{status}</Badge>
    }
}

export function WorkshopStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "In Workshop":
            return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{status}</Badge>
        case "Solved":
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>
        case "Not Solved":
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{status}</Badge>
        default:
            return <Badge variant="secondary">{status}</Badge>
    }
}
