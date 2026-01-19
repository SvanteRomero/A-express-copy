'use client'

import { Button } from '@/components/ui/core/button'
import { useNewTaskForm } from '@/hooks/use-new-task-form'
import { CustomerDeviceSection } from './new-task-form/customer-device-section'
import { IssueDetailsSection } from './new-task-form/issue-details-section'
import { DuplicatePhoneDialog } from './task_utils/duplicate-phone-dialog'

interface NewTaskFormProps { }

/**
 * New Task Form - Main Component
 * 
 * Refactored to use composition pattern with:
 * - useNewTaskForm hook for all state and logic
 * - CustomerDeviceSection for customer/device fields
 * - IssueDetailsSection for issue/assignment fields
 * - DuplicatePhoneDialog for duplicate phone warnings
 */
export function NewTaskForm({ }: NewTaskFormProps) {
  const form = useNewTaskForm()

  return (
    <>
      <form onSubmit={form.handleSubmit} className='space-y-6 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <CustomerDeviceSection form={form} />
          <IssueDetailsSection form={form} />
        </div>

        <div className='flex justify-end gap-4 pt-4'>
          <Button type="button" variant="outline" onClick={form.handleBack}>
            Back
          </Button>
          <Button
            type='submit'
            disabled={form.isSubmitting}
            className='bg-red-600 hover:bg-red-700 text-white'
          >
            {form.isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>

      <DuplicatePhoneDialog
        isOpen={form.duplicatePhoneAlert.isOpen}
        phone={form.duplicatePhoneAlert.phone}
        customerName={form.duplicatePhoneAlert.customerName}
        onClose={form.closeDuplicatePhoneAlert}
      />
    </>
  )
}
