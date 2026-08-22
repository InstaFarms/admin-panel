"use client";

import { Card, Label, Datepicker, TextInput } from "flowbite-react";

interface BookingDetailsProps {
    checkinDate: Date | null;
    onCheckinChange: (date: Date | null) => void;
    checkoutDate: Date | null;
    onCheckoutChange: (date: Date | null) => void;
    adultCount: number;
    onAdultCountChange: (count: number) => void;
    childrenCount: number;
    onChildrenCountChange: (count: number) => void;
    infantCount: number;
    onInfantCountChange: (count: number) => void;
    floatingAdultCount: number;
    onFloatingAdultCountChange: (count: number) => void;
    floatingChildrenCount: number;
    onFloatingChildrenCountChange: (count: number) => void;
    floatingInfantCount: number;
    onFloatingInfantCountChange: (count: number) => void;
}

export default function BookingDetails({
    checkinDate,
    onCheckinChange,
    checkoutDate,
    onCheckoutChange,
    adultCount,
    onAdultCountChange,
    childrenCount,
    onChildrenCountChange,
    infantCount,
    onInfantCountChange,
    floatingAdultCount,
    onFloatingAdultCountChange,
    floatingChildrenCount,
    onFloatingChildrenCountChange,
    floatingInfantCount,
    onFloatingInfantCountChange
}: BookingDetailsProps) {
    return (
        <Card>
            <h3 className="text-xl font-bold dark:text-white mb-4">1.5 Booking Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dates */}
                <div className="space-y-4">
                    <h4 className="font-semibold dark:text-gray-300">Stay Duration</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="checkinDate">Check-in Date</Label>
                            </div>
                            <Datepicker
                                // @ts-ignore
                                value={checkinDate || undefined}
                                maxDate={checkoutDate ? new Date(checkoutDate.getTime() - 86400000) : undefined}
                                onChange={(date: Date | null) => {
                                    console.log("[BookingDetails] checkinDate onChange:", date);
                                    onCheckinChange(date ? new Date(date) : null);
                                }}
                            />
                        </div>
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="checkoutDate">Check-out Date</Label>
                            </div>
                            <Datepicker
                                // @ts-ignore
                                value={checkoutDate || undefined}
                                minDate={checkinDate ? new Date(checkinDate.getTime() + 86400000) : undefined}
                                onChange={(date: Date | null) => {
                                    console.log("[BookingDetails] checkoutDate onChange:", date);
                                    onCheckoutChange(date ? new Date(date) : null);
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Guest Counts */}
                <div className="space-y-4">
                    <h4 className="font-semibold dark:text-gray-300">Guest Counts</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs">Adults</Label>
                            <TextInput
                                type="number"
                                value={adultCount}
                                onChange={(e) => onAdultCountChange(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Children</Label>
                            <TextInput
                                type="number"
                                value={childrenCount}
                                onChange={(e) => onChildrenCountChange(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Infants</Label>
                            <TextInput
                                type="number"
                                value={infantCount}
                                onChange={(e) => onInfantCountChange(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>

                {/* Floating Guest Counts */}
                <div className="space-y-4">
                    <h4 className="font-semibold dark:text-gray-300">Floating Guests</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs">Adults</Label>
                            <TextInput
                                type="number"
                                value={floatingAdultCount}
                                onChange={(e) => onFloatingAdultCountChange(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Children</Label>
                            <TextInput
                                type="number"
                                value={floatingChildrenCount}
                                onChange={(e) => onFloatingChildrenCountChange(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Infants</Label>
                            <TextInput
                                type="number"
                                value={floatingInfantCount}
                                onChange={(e) => onFloatingInfantCountChange(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
