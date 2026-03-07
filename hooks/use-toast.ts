"use client"

import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/feedback/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000 // Auto-dismiss after 5 seconds

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  playSound?: boolean  // Optional flag to play notification sound
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
    type: ActionType["ADD_TOAST"]
    toast: ToasterToast
  }
  | {
    type: ActionType["UPDATE_TOAST"]
    toast: Partial<ToasterToast>
  }
  | {
    type: ActionType["DISMISS_TOAST"]
    toastId?: ToasterToast["id"]
  }
  | {
    type: ActionType["REMOVE_TOAST"]
    toastId?: ToasterToast["id"]
  }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string, delay: number = TOAST_REMOVE_DELAY) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, delay)

  toastTimeouts.set(toastId, timeout)
}

/**
 * Pure reducer — no side effects. Side effects (dismiss timers) are handled
 * by the dismissToast() action wrapper below.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
              ...t,
              open: false,
            }
            : t,
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

/**
 * Dismiss a toast by ID (or all toasts if no ID).
 * Side effects (scheduling removal) are handled here, outside the reducer.
 */
function dismissToast(toastId?: string, delay: number = TOAST_REMOVE_DELAY) {
  if (toastId) {
    addToRemoveQueue(toastId, delay)
  } else {
    memoryState.toasts.forEach((t) => {
      addToRemoveQueue(t.id, delay)
    })
  }

  dispatch({ type: "DISMISS_TOAST", toastId })
}

// ── Sound checker callback (replaces require() for circular dep avoidance) ──

type SoundChecker = (toastType: string) => boolean
let _soundChecker: SoundChecker | null = null

/**
 * Register a function that checks notification preferences for sound.
 * Called by NotificationPreferencesProvider on mount.
 */
export function registerSoundChecker(fn: SoundChecker) {
  _soundChecker = fn
}

type Toast = Omit<ToasterToast, "id"> & { toastType?: string }

function playNotificationSound() {
  try {
    const audio = new Audio("/notification.wav")
    audio.play().catch((error) => console.error("Failed to play notification sound:", error))
  } catch (error) {
    console.error("Audio initialization failed:", error)
  }
}

function toast({ playSound = false, toastType, ...props }: Toast) {
  const id = genId()

  // Play sound if: explicitly requested OR if preferences say this toast type should play sound
  if (playSound) {
    playNotificationSound()
  } else if (toastType && _soundChecker) {
    if (_soundChecker(toastType)) {
      playNotificationSound()
    }
  }

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dismissToast(id)

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // Auto-dismiss after duration (single timer — no dual-timer race)
  if (props.duration !== Infinity) {
    const dismissDelay = props.duration === undefined ? TOAST_REMOVE_DELAY : props.duration
    setTimeout(() => {
      dismiss()
    }, dismissDelay)
  }

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, []) // Mount-only — setState is a stable reference

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dismissToast(toastId),
  }
}

export { useToast, toast }
