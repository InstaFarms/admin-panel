"use client";

import { downloadBookings } from "@/actions/bookingActions";
import { Button, Label, Select } from "flowbite-react";
import { useState } from "react";
import { DatePicker } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { HiDownload } from "react-icons/hi";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

type FilterType = "" | "creation" | "booking";

/** Flatten a single booking (with nested property, customer, etc.) into a row for Excel */
function bookingToRow(record: Record<string, unknown>): Record<string, any> {
  const p = (record.property as Record<string, unknown>) ?? {};
  const c = (record.customer as Record<string, unknown>) ?? {};
  const cancel = (record.cancellation as Record<string, unknown>) ?? {};
  const creator = (record.bookingCreator as Record<string, unknown>) ?? {};
  const customerName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || null;
  const creatorName = [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim() || null;
  return {
    "Booking ID": record.id ?? "",
    "Property Code": p.propertyCode ?? "",
    "Property Name": p.propertyName ?? "",
    "Check-in": record.checkinDate ?? "",
    "Check-out": record.checkoutDate ?? "",
    "Nights": record.durationNights ?? "",
    "Booking Type": record.bookingType ?? "",
    "Booking Source": record.bookingSource ?? "",
    "Status": record.status ?? "",
    "Adults": record.adultCount ?? "",
    "Children": record.childrenCount ?? "",
    "Infants": record.infantCount ?? "",
    "Customer Name": customerName,
    "Customer Email": c.email ?? "",
    "Customer Mobile": c.mobileNumber ?? "",
    "Base Amount (with GST)": record.baseRentalAmountWithGst ?? "",
    "Total Discount": record.totalDiscountAmount ?? "",
    "Amount Paid (with GST)": record.bookingAmountPaidWithGst ?? "",
    "Full Amount (with GST)": record.fullBookingAmountWithGst ?? "",
    "Remaining Amount": record.remainingAmountToBePaidWithGst ?? "",
    "Owner Revenue": record.ownerRevenue ?? "",
    "Payment Status": record.paymentStatus ?? "",
    "Remarks": record.bookingRemarks ?? "",
    "Special Requests": record.specialRequests ?? "",
    "Created At": record.createdAt ?? "",
    "Created By": creatorName,
    "Creator Email": creator.email ?? "",
    "Cancelled": cancel.id != null ? "Yes" : "No",
    "Refund Amount": cancel.refundAmount ?? "",
    "Refund Status": cancel.refundStatus ?? "",
  };
}

export default function DownloadBookingsForm() {
  const [filterType, setFilterType] = useState<FilterType>("");
  const [bookingCreationDate, setBookingCreationDate] = useState<Date | null>(null);
  const [bookingDateFrom, setBookingDateFrom] = useState<Date | null>(null);
  const [bookingDateTo, setBookingDateTo] = useState<Date | null>(null);
  const [bookingSource, setBookingSource] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDownload = async () => {
    // Validate that filter type is selected
    if (!filterType) {
      toast.error("Please select a filter type");
      return;
    }

    // Validate based on filter type
    if (filterType === "creation" && !bookingCreationDate) {
      toast.error("Please select a booking creation date");
      return;
    }

    if (filterType === "booking") {
      if (!bookingDateFrom || !bookingDateTo) {
        toast.error("Please select both check-in and check-out dates");
        return;
      }
    }

    setIsDownloading(true);

    try {
      const params: any = {};

      if (filterType === "creation" && bookingCreationDate) {
        params.bookingCreationDate = getLocalDateString(bookingCreationDate);
      }
      
      if (filterType === "booking") {
        if (bookingDateFrom) {
          params.bookingDateFrom = getLocalDateString(bookingDateFrom);
        }
        if (bookingDateTo) {
          params.bookingDateTo = getLocalDateString(bookingDateTo);
        }
      }

      if (bookingSource) {
        params.bookingSource = bookingSource;
      }

      const result = await downloadBookings(params);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success) {
        const data = Array.isArray(result.success) ? result.success : [];
        const rows = data.map((record: Record<string, unknown>) => bookingToRow(record));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bookings_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`Bookings downloaded successfully (${rows.length} rows)`);
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download bookings");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClear = () => {
    setFilterType("");
    setBookingCreationDate(null);
    setBookingDateFrom(null);
    setBookingDateTo(null);
    setBookingSource("");
  };

  const handleFilterTypeChange = (newFilterType: FilterType) => {
    setFilterType(newFilterType);
    // Clear date fields when switching filter types
    setBookingCreationDate(null);
    setBookingDateFrom(null);
    setBookingDateTo(null);
  };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Filter Type Selection */}
        <div>
          <Label htmlFor="filterType" className="mb-2 block">
            Filter By <span className="text-red-500">*</span>
          </Label>
          <Select
            id="filterType"
            value={filterType}
            onChange={(e) => handleFilterTypeChange(e.target.value as FilterType)}
            required
          >
            <option value="">Select filter type</option>
            <option value="creation">Booking Creation Date</option>
            <option value="booking">Booking Dates (Check-in/Check-out)</option>
          </Select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Choose how you want to filter bookings
          </p>
        </div>

        {/* Booking Source */}
        <div>
          <Label htmlFor="bookingSource" className="mb-2 block">
            Booking Source
          </Label>
          <Select
            id="bookingSource"
            value={bookingSource}
            onChange={(e) => setBookingSource(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="Instafarms">Instafarms</option>
            <option value="jarvis">Jarvis</option>
            <option value="mago">Mago</option>
            <option value="others">Others</option>
          </Select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Optional: Filter by booking source platform
          </p>
        </div>

        {/* Conditional Date Fields */}
        {filterType === "creation" && (
          <div className="md:col-span-2">
            <Label htmlFor="bookingCreationDate" className="mb-2 block">
              Booking Creation Date <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              id="bookingCreationDate"
              selected={bookingCreationDate}
              onChange={(date) => setBookingCreationDate(date)}
              dateFormat="MMM d, yyyy"
              placeholderText="Select creation date"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              isClearable
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Filter by the date when booking was created
            </p>
          </div>
        )}

        {filterType === "booking" && (
          <>
            {/* Booking Date From (Check-in) */}
            <div>
              <Label htmlFor="bookingDateFrom" className="mb-2 block">
                Check-in Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="bookingDateFrom"
                selected={bookingDateFrom}
                onChange={(date) => setBookingDateFrom(date)}
                dateFormat="MMM d, yyyy"
                placeholderText="Select check-in date"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                isClearable
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Start date of booking stay period
              </p>
            </div>

            {/* Booking Date To (Check-out) */}
            <div>
              <Label htmlFor="bookingDateTo" className="mb-2 block">
                Check-out Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="bookingDateTo"
                selected={bookingDateTo}
                onChange={(date) => setBookingDateTo(date)}
                dateFormat="MMM d, yyyy"
                placeholderText="Select check-out date"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                minDate={bookingDateFrom || undefined}
                isClearable
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                End date of booking stay period
              </p>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !filterType}
          className="flex items-center gap-2"
        >
          <HiDownload className="h-5 w-5" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
        <Button color="gray" onClick={handleClear} disabled={isDownloading}>
          Clear Filters
        </Button>
      </div>

    </div>
  );
}
