"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/feedback/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }, index) {
        // Staggered animation delay for cascade effect
        const staggerDelay = index * 100 // 100ms delay between each toast

        return (
          <Toast
            key={id}
            {...props}
            style={{
              animationDelay: `${staggerDelay}ms`,
              // Stack toasts with slight offset for visual cascade
              transform: `translateY(${index * 4}px)`,
              zIndex: 100 - index,
            }}
            className={props.className}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

