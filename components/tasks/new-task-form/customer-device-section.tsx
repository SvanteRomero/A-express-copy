'use client'

import { Button } from '@/components/ui/core/button'
import { Input } from '@/components/ui/core/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/core/select'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { SimpleCombobox } from '@/components/ui/core/combobox'
import { FormField } from '@/components/ui/form/form-field'
import { CUSTOMER_TYPE_OPTIONS } from '@/lib/constants/task-options'
import type { UseNewTaskFormReturn } from '@/hooks/use-new-task-form'

interface CustomerDeviceSectionProps {
    form: UseNewTaskFormReturn
}

/**
 * Customer & Device section of the new task form
 * Handles customer selection, phone numbers, customer type, brand, and model
 */
export function CustomerDeviceSection({ form }: CustomerDeviceSectionProps) {
    const {
        formData,
        errors,
        customerOptions,
        modelOptions,
        brands,
        isLoadingBrands,
        handleInputChange,
        handlePhoneNumberChange,
        addPhoneNumber,
        removePhoneNumber,
        handleCustomerSelect,
        setCustomerSearch,
        setModelSearch,
    } = form

    return (
        <div className='space-y-4'>
            <h3 className='text-lg font-medium text-gray-900'>Customer & Device</h3>

            <FormField id='title' label='Task ID' required error={errors.title}>
                <Input
                    id='title'
                    value="Will be generated on creation"
                    readOnly
                    className='bg-gray-100'
                />
            </FormField>

            <FormField id='customer_name' label='Customer Name' required error={errors.customer_name}>
                <SimpleCombobox
                    options={customerOptions}
                    value={formData.customer_name}
                    onChange={handleCustomerSelect}
                    onInputChange={(value) => {
                        handleInputChange('customer_name', value)
                        setCustomerSearch(value)
                    }}
                    placeholder="Search or create customer..."
                />
            </FormField>

            {formData.customer_phone_numbers.map((phone, index) => (
                <FormField
                    key={index}
                    id={`customer_phone_${index}`}
                    label={`Phone Number ${index + 1}`}
                    required
                    error={errors[`customer_phone_${index}`]}
                >
                    <div className="flex items-center gap-2">
                        <Input
                            id={`customer_phone_${index}`}
                            type='text'
                            value={phone.phone_number}
                            onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                            className={errors[`customer_phone_${index}`] ? 'border-red-500' : ''}
                            placeholder="e.g. 0712 345 678"
                        />
                        {formData.customer_phone_numbers.length > 1 && (
                            <Button type="button" variant="outline" onClick={() => removePhoneNumber(index)}>-</Button>
                        )}
                    </div>
                </FormField>
            ))}

            <Button type="button" variant="outline" onClick={addPhoneNumber}>+ Add Phone Number</Button>

            <FormField id='customer_type' label='Customer Type'>
                <Tabs
                    value={formData.customer_type}
                    onValueChange={(value) => handleInputChange('customer_type', value)}
                >
                    <TabsList>
                        {CUSTOMER_TYPE_OPTIONS.map((option) => (
                            <TabsTrigger
                                key={option.value}
                                value={option.value}
                                className='data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=inactive]:bg-gray-200'
                            >
                                {option.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </FormField>

            <div className='grid grid-cols-2 gap-4'>
                <FormField id='brand' label='Brand' required error={errors.brand}>
                    <Select
                        value={formData.brand}
                        onValueChange={(value) => handleInputChange('brand', value)}
                        disabled={isLoadingBrands}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                            {brands?.map((brand) => (
                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                    {brand.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField id='laptop_model' label='Model' required error={errors.laptop_model}>
                    <SimpleCombobox
                        options={modelOptions}
                        value={formData.laptop_model}
                        onChange={(value) => handleInputChange('laptop_model', value)}
                        onInputChange={(value) => {
                            handleInputChange('laptop_model', value)
                            setModelSearch(value)
                        }}
                        placeholder="Search or create model..."
                        disabled={formData.device_type === 'Motherboard Only' || !formData.brand}
                    />
                </FormField>
            </div>
        </div>
    )
}
