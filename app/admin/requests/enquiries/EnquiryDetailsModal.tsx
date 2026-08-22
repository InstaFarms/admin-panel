"use client";

import { Modal, Button, Badge } from "flowbite-react";
import { format } from "date-fns";

interface EnquiryDetailsModalProps {
  showModal: boolean;
  closeCallback: () => void;
  enquiry: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
    phoneNumber?: string;
    enquiryType: string;
    subject: string;
    message: string;
    propertyId?: string;
    eventDate?: string;
    guestCount?: number;
    checkinDate?: string;
    checkoutDate?: string;
    status: string;
    responseMessage?: string;
    responseDate?: string;
    createdAt: string;
    property?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export default function EnquiryDetailsModal({
  showModal,
  closeCallback,
  enquiry,
}: EnquiryDetailsModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "in_progress":
        return "info";
      case "resolved":
        return "success";
      case "closed":
        return "gray";
      case "spam":
        return "failure";
      default:
        return "gray";
    }
  };

  const getTypeDisplay = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Modal show={showModal} onClose={closeCallback} size="3xl">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl min-h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enquiry Details
            </h3>
            <Badge color={getStatusColor(enquiry.status)} size="sm">
              {enquiry.status}
            </Badge>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Request Type
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                  {getTypeDisplay(enquiry.enquiryType)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created At
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                  {format(new Date(enquiry.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                  {enquiry.firstName} {enquiry.lastName || ""}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border break-all">
                  {enquiry.email}
                </p>
              </div>
            </div>
            
            {enquiry.phoneNumber && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Number
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                  {enquiry.phoneNumber}
                </p>
              </div>
            )}
          </div>

          {/* Enquiry Details Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Enquiry Details
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border">
                  {enquiry.subject}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {enquiry.message}
                </div>
              </div>
            </div>
          </div>

          {/* Property & Event Information Section */}
          {(enquiry.property || enquiry.eventDate || enquiry.guestCount || enquiry.checkinDate || enquiry.checkoutDate) && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Property & Event Information
              </h4>
              <div className="space-y-4">
                {enquiry.property && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Property
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                      {enquiry.property.name}
                    </p>
                  </div>
                )}

                {enquiry.eventDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Event Date
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                      {format(new Date(enquiry.eventDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                )}

                {enquiry.guestCount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Guest Count
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                      {enquiry.guestCount} guests
                    </p>
                  </div>
                )}

                {enquiry.checkinDate && enquiry.checkoutDate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Check-in Date
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                        {format(new Date(enquiry.checkinDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Check-out Date
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                        {format(new Date(enquiry.checkoutDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Response Section */}
          {(enquiry.responseMessage || enquiry.responseDate) && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Response
              </h4>
              <div className="space-y-4">
                {enquiry.responseMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Response Message
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {enquiry.responseMessage}
                    </div>
                  </div>
                )}

                {enquiry.responseDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Response Date
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                      {format(new Date(enquiry.responseDate), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end gap-3 w-full">
            <Button onClick={closeCallback} color="gray" size="sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}