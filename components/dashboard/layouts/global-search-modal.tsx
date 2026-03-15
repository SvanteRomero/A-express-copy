"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, Laptop, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/core/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/feedback/dialog"
import { useTasksSearch } from "@/hooks/use-tasks-search"
import { useDebounce } from "@/hooks/use-debounce"
import { StatusBadge, UrgencyBadge, PaymentStatusBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function GlobalSearchModal() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()

  const debouncedQuery = useDebounce(query, 300)
  const { data, isLoading } = useTasksSearch({ query: debouncedQuery, pageSize: 10 })
  const results = data?.results || []

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleOpenChange = useCallback((val: boolean) => {
    setOpen(val)
    if (!val) {
      setTimeout(() => setQuery(""), 200) // Clear after exit animation
    }
  }, [])

  const handleSelect = useCallback((task: any) => {
    router.push(`/dashboard/tasks/${task.title}`)
    handleOpenChange(false)
  }, [router, handleOpenChange])

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80 border border-gray-200/60 bg-gray-50/50 hover:bg-gray-100/80 transition-all duration-200 rounded-full h-9 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
        <span className="hidden lg:inline-flex text-gray-500">Search tasks, customers...</span>
        <span className="inline-flex lg:hidden text-gray-500">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.4rem] hidden h-[1.3rem] select-none items-center gap-1 rounded-full border border-gray-200/80 bg-white px-2 font-mono text-[10px] font-medium opacity-100 sm:flex text-gray-500 shadow-sm">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-xl border-gray-200/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-[20px] 
          data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200">
          <DialogTitle className="sr-only">Search Tasks</DialogTitle>
          <Command 
            className="bg-transparent rounded-2xl" 
            shouldFilter={false} // Disable internal filtering, use API search
          >
            <div className="relative">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search tasks, customers, or devices..."
                className="h-14 font-medium sm:text-base focus-visible:ring-0 placeholder:text-gray-400 bg-transparent border-0 ring-0 px-2 flex-1"
                autoFocus
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                   <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                </div>
              )}
            </div>

            <CommandList className="max-h-[60vh] overflow-y-auto w-full p-2.5 space-y-1">
              {!isLoading && query.length > 0 && results.length === 0 && (
                <CommandEmpty className="py-14 text-center text-sm flex flex-col items-center gap-3">
                   <div className="h-12 w-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm">
                     <Search className="h-5 w-5 text-gray-300" />
                   </div>
                   <p className="text-gray-900 font-medium">No results found for &ldquo;<span className="font-semibold">{query}</span>&rdquo;</p>
                   <p className="text-xs text-gray-500">Try searching for a different keyword or task ID</p>
                </CommandEmpty>
              )}

              {query.length === 0 && (
                <div className="py-14 text-center text-sm flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm animate-pulse">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-gray-800 font-semibold tracking-tight text-base">Quick Search</p>
                    <p className="text-xs text-gray-500 max-w-[260px] leading-relaxed">Search globally across all tasks, customers, issues, and device records.</p>
                </div>
              )}

              {results.length > 0 && (
                <CommandGroup heading="Tasks" className="text-xs font-semibold text-gray-400 px-1 py-1 uppercase tracking-wider">
                  {results.map((task: any) => (
                    <CommandItem
                      key={task.title}
                      value={task.title}
                      onSelect={() => handleSelect(task)}
                      className="flex flex-col items-start px-4 py-3.5 cursor-pointer rounded-xl my-1 group aria-selected:bg-blue-50/60 hover:bg-blue-50/60 transition-all duration-200 border-x-2 border-y border-x-transparent border-y-transparent aria-selected:border-l-indigo-500 aria-selected:shadow-sm"
                    >
                      <div className="w-full flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">#{task.title}</span>
                          <div className="hidden sm:flex items-center gap-1.5 ml-2">
                             {task.urgency && <UrgencyBadge urgency={task.urgency} />}
                             {task.payment_status && <PaymentStatusBadge status={task.payment_status} />}
                             {task.workshop_status && <WorkshopStatusBadge status={task.workshop_status} />}
                          </div>
                        </div>
                        <StatusBadge status={task.status} isTerminated={task.is_terminated} />
                      </div>
                      
                      <div className="w-full flex items-center gap-4 text-xs mt-1 text-gray-500 group-hover:text-gray-700 transition-colors">
                        <div className="flex items-center gap-1.5 font-medium">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate max-w-[120px]">{task.customer_details?.name || "No Customer"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Laptop className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate max-w-[180px]">{task.brand_details?.name} {task.laptop_model_details?.name}</span>
                        </div>
                      </div>
                      
                      {task.description && (
                        <div className="w-full mt-2.5 flex items-start gap-1.5 text-gray-500 text-xs">
                           <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                           <p className="line-clamp-1 flex-1 leading-snug">{task.description}</p>
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            
            {results.length > 0 && query.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100/50 bg-gray-50/30 text-xs text-gray-500 flex items-center justify-between rounded-b-[20px]">
                <span><strong className="text-gray-900">{results.length}</strong> result{results.length === 1 ? "" : "s"}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="bg-white border text-gray-400 shadow-[0_1px_1px_rgba(0,0,0,0.05)] rounded-[4px] px-1.5 py-0.5 min-w-[20px] text-center font-mono">↑</kbd><kbd className="bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] border text-gray-400 rounded-[4px] px-1.5 py-0.5 min-w-[20px] text-center font-mono">↓</kbd> navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-white text-gray-400 shadow-[0_1px_1px_rgba(0,0,0,0.05)] border rounded-[4px] px-1.5 py-0.5 border-gray-200 font-mono text-[10px]">Enter</kbd> open</span>
                </div>
              </div>
            )}
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
