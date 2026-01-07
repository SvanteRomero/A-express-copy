'use client'

import { Input } from '@/components/ui/core/input'
import { Textarea } from '@/components/ui/core/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/core/select'
import { Checkbox } from '@/components/ui/core/checkbox'
import { CurrencyInput } from "@/components/ui/core/currency-input"
import { SimpleCombobox } from '@/components/ui/core/combobox'
import { FormField } from '@/components/ui/form/form-field'
import { URGENCY_OPTIONS, DEVICE_TYPE_OPTIONS } from '@/lib/constants/task-options'
import type { UseNewTaskFormReturn } from '@/hooks/use-new-task-form'

interface IssueDetailsSectionProps {
    form: UseNewTaskFormReturn
}

/**
 * Issue Details section of the new task form
 * Handles description, device type, urgency, location, assignment, and referral
 */
export function IssueDetailsSection({ form }: IssueDetailsSectionProps) {
    const {
        formData,
        errors,
        isReferred,
        canAssignTechnician,
        user,
        managers,
        technicians,
        workshopTechnicians,
        locations,
        filteredLocations,
        referrerOptions,
        isLoadingManagers,
        isLoadingTechnicians,
        isLoadingWorkshopTechnicians,
        isLoadingLocations,
        handleInputChange,
        handleReferredChange,
        handleReferrerSelect,
        setReferrerSearch,
    } = form

    return (
        <div className='space-y-4'>
            <h3 className='text-lg font-medium text-gray-900'>Issue Details</h3>

            <FormField id='description' label='Issue Description' required error={errors.description}>
                <Textarea
                    id='description'
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={canAssignTechnician ? 4 : 7}
                    className={errors.description ? 'border-red-500' : ''}
                    placeholder="e.g. The laptop is not turning on. No signs of life."
                />
            </FormField>

            <FormField id='device_type' label='Device Type'>
                <Select value={formData.device_type} onValueChange={(value) => handleInputChange('device_type', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                        {DEVICE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField
                id='device_notes'
                label='Device Notes'
                required={formData.device_type === 'Not Full' || formData.device_type === 'Motherboard Only'}
                error={errors.device_notes}
            >
                <Textarea
                    id='device_notes'
                    value={formData.device_notes}
                    onChange={(e) => handleInputChange('device_notes', e.target.value)}
                    className={errors.device_notes ? 'border-red-500' : ''}
                    placeholder="e.g. Customer brought only the motherboard and the screen."
                />
            </FormField>

            <FormField id='estimated_cost' label='Estimated Cost (TSh)' required error={errors.estimated_cost}>
                <CurrencyInput
                    id='estimated_cost'
                    value={formData.estimated_cost ?? 0}
                    onValueChange={(value) => handleInputChange('estimated_cost', value)}
                    placeholder="e.g. 150,000"
                />
            </FormField>

            <FormField id='urgency' label='Urgency' required error={errors.urgency}>
                <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                    <SelectTrigger className={errors.urgency ? 'border-red-500' : ''}>
                        <SelectValue placeholder='Set urgency' />
                    </SelectTrigger>
                    <SelectContent>
                        {URGENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField id='current_location' label='Initial Location' required error={errors.current_location}>
                <Select
                    value={formData.current_location}
                    onValueChange={(value) => handleInputChange('current_location', value)}
                    disabled={isLoadingLocations}
                >
                    <SelectTrigger className={errors.current_location ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredLocations?.map((location) => (
                            <SelectItem key={location.id} value={location.name}>
                                {location.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField id='negotiated_by' label='Negotiated By'>
                {user?.role === 'Manager' ? (
                    <Input
                        id='negotiated_by'
                        value={`${user.first_name} ${user.last_name}`}
                        readOnly
                        className='bg-gray-100'
                    />
                ) : (
                    <Select
                        value={formData.negotiated_by}
                        onValueChange={(value) => handleInputChange('negotiated_by', value)}
                        disabled={isLoadingManagers}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                            {managers?.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id.toString()}>
                                    {manager.first_name} {manager.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </FormField>

            {canAssignTechnician && (
                <FormField id='assigned_to' label='Assign Technician'>
                    <Select
                        value={formData.assigned_to}
                        onValueChange={(value) => handleInputChange('assigned_to', value)}
                        disabled={isLoadingTechnicians || isLoadingWorkshopTechnicians}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select technician" />
                        </SelectTrigger>
                        <SelectContent>
                            {(locations?.find(l => l.name === formData.current_location)?.is_workshop
                                ? workshopTechnicians
                                : technicians
                            )?.map((technician) => (
                                <SelectItem key={technician.id} value={technician.id.toString()}>
                                    {technician.first_name} {technician.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
            )}

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="is_referred"
                    checked={isReferred}
                    onCheckedChange={handleReferredChange}
                />
                <label
                    htmlFor="is_referred"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Referred
                </label>
            </div>

            {isReferred && (
                <FormField id='referred_by' label='Referred By' required error={errors.referred_by}>
                    <SimpleCombobox
                        options={referrerOptions}
                        value={formData.referred_by}
                        onChange={handleReferrerSelect}
                        onInputChange={(value) => {
                            handleInputChange('referred_by', value)
                            setReferrerSearch(value)
                        }}
                        placeholder="Search or create referrer..."
                    />
                </FormField>
            )}
        </div>
    )
}
