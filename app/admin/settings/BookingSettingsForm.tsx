"use client";

import { useState, useTransition } from "react";

import { Button, Label, TextInput, Alert } from "flowbite-react";

import { updateBookingExpiry } from "@/actions/settingsActions";
import { SETTINGS_ERRORS } from "@/constants/settings";

interface BookingSettingsFormProps {
    initialExpiryHours: number;
}

export default function BookingSettingsForm({
    initialExpiryHours
}: BookingSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = (formData: FormData) => {
        startTransition(() => {
            updateBookingExpiry(formData).then((result) => {
                if (result.success) {
                    setMessage({ type: "success", text: result.success });
                } else if (result.error) {
                    setMessage({ type: "error", text: result.error });
                }

                // Clear message after 5 seconds
                setTimeout(() => setMessage(null), 5000);
            }).catch(() => {
                setMessage({ type: "error", text: SETTINGS_ERRORS.bookingUpdateFailed });
                setTimeout(() => setMessage(null), 5000);
            });
        });
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            {message && (
                <Alert color={message.type === "success" ? "success" : "failure"}>
                    {message.text}
                </Alert>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                <Label htmlFor="bookingExpiryHours" className="mb-2 block">
                    Booking Request Expiry (Hours) <span className="text-red-500">*</span>
                </Label>
                <div className="max-w-xs">
                    <TextInput
                        id="bookingExpiryHours"
                        name="bookingExpiryHours"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={initialExpiryHours}
                        placeholder="24"
                        className="w-full"
                        required
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Time in hours a host has to accept or reject a booking request before it auto-expires.
                    </p>
                </div>
            </div>

            <div className="flex justify-start">
                <Button
                    type="submit"
                    disabled={isPending}
                    className="px-6"
                >
                    {isPending ? "Saving..." : "Save Booking Settings"}
                </Button>
            </div>
        </form>
    );
}
