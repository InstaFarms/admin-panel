"use client";

import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";

import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import { createProposal, updateProposal } from "@/actions/proposalActions";

import { SortableProperty as Property } from "@/utils/types";

import { mapPropertyData } from "@/lib/propertyUtils";

import CustomerDetails from "@/components/proposals/CustomerDetails";
import BookingDetails from "@/components/proposals/BookingDetails";
import PropertySearch from "@/components/proposals/PropertySearch";
import SelectedProperties from "@/components/proposals/SelectedProperties";

import { useRouter } from "next/navigation";
import { CustomerBrandName } from "@/constants/customerBrands";

interface ProposalBuilderProps {
    brandName?: CustomerBrandName;
    basePath?: string;
    initialData?: {
        id: string;
        customerId: string;
        notes?: string;
        validTill?: string;
        checkinDate?: string;
        checkoutDate?: string;
        adultCount?: number;
        childrenCount?: number;
        infantCount?: number;
        floatingAdultCount?: number;
        floatingChildrenCount?: number;
        floatingInfantCount?: number;
        items: { order: number; property: Property }[];
        customerFirstName: string;
        customerLastName: string | null;
    }
}

export default function ProposalBuilder({ initialData, brandName, basePath = "/admin/proposals" }: ProposalBuilderProps) {
    const router = useRouter();

    // -- State: Selected Properties --
    const [selectedProperties, setSelectedProperties] = useState<Property[]>(() => {
        if (!initialData?.items) return [];
        return initialData.items.map(i => mapPropertyData(i.property));
    });

    // -- State: Customer & Basic Info --
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialData?.customerId || "");
    const [selectedCustomerForCombobox, setSelectedCustomerForCombobox] = useState<{ id: string, firstName: string, lastName: string | null } | null>(
        initialData ? {
            id: initialData.customerId,
            firstName: initialData.customerFirstName,
            lastName: initialData.customerLastName
        } : null
    );

    const [validTill, setValidTill] = useState<Date | null>(() => {
        if (initialData?.validTill) {
            const d = new Date(initialData.validTill);
            if (!isNaN(d.getTime())) return d;
        }
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [notes, setNotes] = useState(initialData?.notes || "");

    // -- State: Booking Details --
    const [checkinDate, setCheckinDate] = useState<Date | null>(() =>
        initialData?.checkinDate ? new Date(initialData.checkinDate) : null
    );
    const [checkoutDate, setCheckoutDate] = useState<Date | null>(() =>
        initialData?.checkoutDate ? new Date(initialData.checkoutDate) : null
    );
    const [adultCount, setAdultCount] = useState(initialData?.adultCount || 0);
    const [childrenCount, setChildrenCount] = useState(initialData?.childrenCount || 0);
    const [infantCount, setInfantCount] = useState(initialData?.infantCount || 0);
    const [floatingAdultCount, setFloatingAdultCount] = useState(initialData?.floatingAdultCount || 0);
    const [floatingChildrenCount, setFloatingChildrenCount] = useState(initialData?.floatingChildrenCount || 0);
    const [floatingInfantCount, setFloatingInfantCount] = useState(initialData?.floatingInfantCount || 0);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // -- Handlers --
    const handleAddProperty = useCallback((property: Property) => {
        if (selectedProperties.find(p => p.id === property.id)) {
            toast.error("Property already added");
            return;
        }
        setSelectedProperties(prev => [...prev, property]);
        toast.success("Added to proposal");
    }, [selectedProperties]);

    const handleRemoveProperty = useCallback((id: string) => {
        setSelectedProperties(prev => prev.filter(p => p.id !== id));
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSelectedProperties((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const localIsoDateAtNoon = (d: Date | null) => {
        if (!d) return undefined;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T12:00:00.000Z`;
    };

    const localIsoDateAtMidnight = (d: Date | null) => {
        if (!d) return undefined;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId) {
            toast.error("Please select a customer");
            return;
        }
        if (selectedProperties.length < 3) {
            toast.error("Please add at least 3 properties");
            return;
        }

        if (checkinDate && checkoutDate && checkinDate >= checkoutDate) {
            toast.error("Check-in date must be before check-out date");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                customerId: selectedCustomerId,
                notes,
                validTill: localIsoDateAtNoon(validTill),
                checkinDate: checkinDate ? localIsoDateAtMidnight(checkinDate) : undefined,
                checkoutDate: checkoutDate ? localIsoDateAtMidnight(checkoutDate) : undefined,
                adultCount,
                childrenCount,
                infantCount,
                floatingAdultCount,
                floatingChildrenCount,
                floatingInfantCount,
                items: selectedProperties.map((p, idx) => ({
                    propertyId: p.id,
                    order: idx
                }))
            };

            let res;
            if (initialData?.id) {
                res = await updateProposal(initialData.id, payload, { brandName, basePath });
            } else {
                res = await createProposal(payload, { brandName, basePath });
            }

            if (res.success) {
                toast.success(initialData?.id ? "Proposal updated successfully!" : "Proposal created successfully!");
                router.push(basePath);
            } else {
                toast.error(res.error || "Failed to save proposal");
            }
        } catch (e) {
            toast.error("An unexpected error occurred");
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <CustomerDetails
                selectedCustomerId={selectedCustomerId}
                selectedCustomer={selectedCustomerForCombobox}
                onCustomerSelect={(customer) => {
                    if (customer) {
                        setSelectedCustomerId(customer.id);
                        setSelectedCustomerForCombobox(customer);
                    } else {
                        setSelectedCustomerId("");
                        setSelectedCustomerForCombobox(null);
                    }
                }}
                validTill={validTill}
                onValidTillChange={setValidTill}
                notes={notes}
                onNotesChange={setNotes}
                isEditing={!!initialData}
                brandName={brandName}
            />

            <BookingDetails
                checkinDate={checkinDate}
                onCheckinChange={(date) => {
                    console.log("[ProposalBuilder] checkinDate update:", date);
                    setCheckinDate(date);
                }}
                checkoutDate={checkoutDate}
                onCheckoutChange={(date) => {
                    console.log("[ProposalBuilder] checkoutDate update:", date);
                    setCheckoutDate(date);
                }}
                adultCount={adultCount}
                onAdultCountChange={setAdultCount}
                childrenCount={childrenCount}
                onChildrenCountChange={setChildrenCount}
                infantCount={infantCount}
                onInfantCountChange={setInfantCount}
                floatingAdultCount={floatingAdultCount}
                onFloatingAdultCountChange={setFloatingAdultCount}
                floatingChildrenCount={floatingChildrenCount}
                onFloatingChildrenCountChange={setFloatingChildrenCount}
                floatingInfantCount={floatingInfantCount}
                onFloatingInfantCountChange={setFloatingInfantCount}
            />

            <PropertySearch
                onAddProperty={handleAddProperty}
                selectedProperties={selectedProperties}
                checkinDate={checkinDate}
                checkoutDate={checkoutDate}
                guestCount={adultCount + childrenCount + infantCount}
                brandName={brandName}
            />

            <SelectedProperties
                selectedProperties={selectedProperties}
                onRemoveProperty={handleRemoveProperty}
                onDragEnd={handleDragEnd}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                isValid={selectedProperties.length >= 3 && !!selectedCustomerId}
                isEditing={!!initialData}
            />
        </div>
    );
}
