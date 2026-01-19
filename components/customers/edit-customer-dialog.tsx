import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/feedback/dialog';
import { Button } from '@/components/ui/core/button';
import { Input } from '@/components/ui/core/input';
import { Label } from '@/components/ui/core/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/core/select';
import { Customer } from '@/components/customers/types';
import { useUpdateCustomer } from '@/hooks/use-customers';
import { Phone, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface EditCustomerDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

// Validate a phone number and return an error message if invalid
function validatePhoneNumber(phone: string): string | null {
  if (!phone.trim()) {
    return 'Phone number is required';
  }
  // Remove common formatting characters for validation
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  if (!/^\d+$/.test(cleaned)) {
    return 'Only digits allowed';
  }
  if (cleaned.length < 9) {
    return 'At least 9 digits required';
  }
  if (cleaned.length > 15) {
    return 'Maximum 15 digits';
  }
  return null;
}

export function EditCustomerDialog({ customer, isOpen, onClose }: EditCustomerDialogProps) {
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState('Normal');
  const [phoneNumbers, setPhoneNumbers] = useState<{ id?: number; phone_number: string }[]>([]);
  const [touched, setTouched] = useState<boolean[]>([]);

  const updateCustomerMutation = useUpdateCustomer();

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setCustomerType(customer.customer_type || 'Normal');
      setPhoneNumbers(customer.phone_numbers || []);
      setTouched([]);
    }
  }, [customer]);

  // Compute validation errors for all phone numbers
  const phoneErrors = useMemo(() => {
    return phoneNumbers.map(pn => validatePhoneNumber(pn.phone_number));
  }, [phoneNumbers]);

  // Check if form is valid
  const hasValidationErrors = phoneNumbers.length > 0 && phoneErrors.some(error => error !== null);

  const handleSave = () => {
    if (customer) {
      const updatedCustomer = {
        ...customer,
        name,
        customer_type: customerType,
        phone_numbers: phoneNumbers,
      };
      updateCustomerMutation.mutate(updatedCustomer, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const handlePhoneNumberChange = (index: number, value: string) => {
    const newPhoneNumbers = [...phoneNumbers];
    newPhoneNumbers[index].phone_number = value;
    setPhoneNumbers(newPhoneNumbers);
  };

  const handlePhoneBlur = (index: number) => {
    const newTouched = [...touched];
    newTouched[index] = true;
    setTouched(newTouched);
  };

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { phone_number: '' }]);
    setTouched([...touched, false]);
  };

  const removePhoneNumber = (index: number) => {
    const newPhoneNumbers = phoneNumbers.filter((_, i) => i !== index);
    setPhoneNumbers(newPhoneNumbers);
    setTouched(touched.filter((_, i) => i !== index));
  };

  if (!isOpen || !customer) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer details for {customer.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              className="col-span-3"
            />
          </div>

          {/* Customer Type Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer-type" className="text-right">Type</Label>
            <Select value={customerType} onValueChange={setCustomerType}>
              <SelectTrigger id="customer-type" className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Repairman">Repairman</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone Numbers Section */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Phone</Label>
            <div className="col-span-3 space-y-2">
              {phoneNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">No phone numbers</p>
              ) : (
                phoneNumbers.map((pn, index) => {
                  const error = phoneErrors[index];
                  const showError = touched[index] && error;
                  return (
                    <div key={pn.id ?? `new-${index}`} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Phone className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ${showError ? 'text-destructive' : 'text-muted-foreground'}`} />
                          <Input
                            value={pn.phone_number}
                            onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                            onBlur={() => handlePhoneBlur(index)}
                            placeholder="Phone number"
                            className={`pl-8 ${showError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhoneNumber(index)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {showError && (
                        <div className="flex items-center gap-1 text-destructive text-xs pl-1">
                          <AlertCircle className="h-3 w-3" />
                          {error}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={addPhoneNumber}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Phone Number
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateCustomerMutation.isPending || !name.trim() || hasValidationErrors}
          >
            {updateCustomerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}