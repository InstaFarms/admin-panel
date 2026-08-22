"use client";

import { useState } from "react";
import { Modal } from "flowbite-react";
import { HiEye } from "react-icons/hi";
import { BookingData } from "@/utils/types";

interface ViewBookingButtonProps {
 booking: BookingData;
}

export default function ViewBookingButton({ booking }: ViewBookingButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)} className="w-fit">
        <div className="rounded-md bg-green-600 p-1">
          <HiEye size={20} className="text-white" />
        </div>
      </button>

      <Modal show={showModal} onClose={() => setShowModal(false)} size="4xl">
        <div className="bg-slate-100 dark:bg-gray-900 p-6 max-h-[80vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-300 dark:border-gray-600">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              View Booking Details
            </h3>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            >
              <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-4 pt-4">
            {/* Property */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Property
              </h4>
              <div className="text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">Code:</span> {booking.property?.propertyCode || 'N/A'}</p>
                <p><span className="font-medium">Name:</span> {booking.property?.propertyName || 'N/A'}</p>
              </div>
            </div>

            {/* Booking Dates */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Booking Dates
              </h4>
              <div className="text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">Check-in:</span> {booking.checkinDate || 'N/A'}</p>
                <p><span className="font-medium">Check-out:</span> {booking.checkoutDate || 'N/A'}</p>
              </div>
            </div>

            {/* Booking ID */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Booking ID
              </h4>
              <div className="text-gray-700 dark:text-gray-300">
                <p>{booking.id || 'N/A'}</p>
              </div>
            </div>

            {/* Booking Type */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Booking Type
              </h4>
              <div className="text-gray-700 dark:text-gray-300">
                <p>{booking.bookingType || 'N/A'}</p>
              </div>
            </div>

            {/* Booking Done By */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Booking Done By
              </h4>
              <div className="text-gray-700 dark:text-gray-300">
                <p>{booking.bookingCreator?.firstName || ''} {booking.bookingCreator?.lastName || ''}</p>
                {(booking.customer?.firstName || booking.customer?.lastName) && (
                  <p><span className="font-medium">Customer:</span> {booking.customer?.firstName || ''} {booking.customer?.lastName || ''}</p>
                )}
                {(booking.adultCount || booking.childrenCount || booking.infantCount) && (
                  <p><span className="font-medium">Guests:</span> Adults: {booking.adultCount || 0}, Children: {booking.childrenCount || 0}, Infants: {booking.infantCount || 0}</p>
                )}
              </div>
            </div>

            {/* Booking Remarks */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Booking Remarks
              </h4>
              <div className="text-gray-700 dark:text-gray-300">
                <p>{booking.remarks || booking.notes || 'No remarks available'}</p>
                {booking.cancellation && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Cancelled
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end pt-6 border-t border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium px-5 py-2.5 hover:text-gray-900 dark:hover:text-white focus:z-10"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}