"use client";

import { Card, Label, Datepicker, Textarea } from "flowbite-react";

import CustomerCombobox from "@/components/CustomerCombobox";
import { CustomerBrandName } from "@/constants/customerBrands";

interface CustomerDetailsProps {
    selectedCustomerId: string;
    onCustomerSelect: (customer: { id: string, firstName: string, lastName: string | null } | null) => void;
    selectedCustomer: { id: string, firstName: string, lastName: string | null } | null;
    validTill: Date | null;
    onValidTillChange: (date: Date | null) => void;
    notes: string;
    onNotesChange: (notes: string) => void;
    isEditing?: boolean;
    brandName?: CustomerBrandName;
}

export default function CustomerDetails({
    selectedCustomerId,
    onCustomerSelect,
    selectedCustomer,
    validTill,
    onValidTillChange,
    notes,
    onNotesChange,
    isEditing = false,
    brandName
}: CustomerDetailsProps) {
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold dark:text-white">1. Customer Details</h3>
                {isEditing && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                        Editing Mode
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <CustomerCombobox
                        onSelect={(customer) => {
                            if (customer) {
                                onCustomerSelect({
                                    id: customer.id,
                                    firstName: customer.firstName,
                                    lastName: customer.lastName || null
                                });
                            } else {
                                onCustomerSelect(null);
                            }
                        }}
                        selectedCustomer={selectedCustomer as any}
                        brandName={brandName}
                    />
                </div>
                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="validTill">Valid Until</Label>
                    </div>
                    <Datepicker
                        minDate={new Date()}
                        // @ts-ignore
                        value={validTill || undefined}
                        onChange={(date: Date | null) => {
                            console.log("[CustomerDetails] validTill onChange selected:", date);
                            if (date) {
                                const newDate = new Date(date);
                                newDate.setHours(0, 0, 0, 0);
                                onValidTillChange(newDate);
                            } else {
                                onValidTillChange(null);
                            }
                        }}
                    />
                </div>
            </div>
            <div className="mt-4">
                <div className="mb-2 block">
                    <Label htmlFor="notes">Internal Notes (Optional)</Label>
                </div>
                <Textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Any specific requirements..."
                />
            </div>
        </Card>
    );
}
