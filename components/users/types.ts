export interface UserResponse {
    id: number
    username: string
    email: string
    role: "Manager" | "Technician" | "Front Desk"
    first_name: string
    last_name: string
    full_name: string
    phone: string
    profile_picture: string
    is_active: boolean
    is_workshop: boolean
    created_at: string
    last_login: string
    address?: string
    bio?: string
}
