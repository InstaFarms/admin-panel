"use client";

import { useState, useTransition } from "react";
import { Modal, Button, Label, TextInput, Textarea, Select, Spinner } from "flowbite-react";
import { HiEye } from "react-icons/hi";
import { updateEnquiryStatus } from "@/actions/enquiryActions";
import { formatAdminDate, formatAdminDateTime } from "@/lib/dateUtils";
import { parseServerActionResult } from "@/utils/utils";
import toast from "react-hot-toast";

interface EnquiryData {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  enquiryType: string;
  subject: string;
  message: string;
  propertyId: string | null;
  eventDate: string | null;
  guestCount: number | null;
  checkinDate: string | null;
  checkoutDate: string | null;
  status: string;
  responseMessage: string | null;
  responseDate: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    slug: string | null;
  } | null;
}

export default function ViewEnquiryButton({ enquiry }: { enquiry: EnquiryData }) {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [status, setStatus] = useState(enquiry.status);
  const [responseMessage, setResponseMessage] = useState(enquiry.responseMessage || "");
  const [loading, startTransition] = useTransition();

  const handleStatusUpdate = () => {
    startTransition(() => {
      const promise = parseServerActionResult(
        updateEnquiryStatus(enquiry.id, status as "pending" | "in_progress" | "resolved" | "closed" | "spam", responseMessage)
      );

      toast.promise(promise, {
        loading: "Updating status...",
        success: (data) => {
          setShowModal(false);
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const formatEnquiryType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <button onClick={() => setShowModal(true)} className="w-fit">
        <div className="rounded-md bg-blue-600 p-1">
          <HiEye size={20} className="text-white" />
        </div>
      </button>

      <Modal show={showModal} onClose={() => setShowModal(false)} size="2xl">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Request For {formatEnquiryType(enquiry.enquiryType)}
            </h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <TextInput
                  id="fullName"
                  value={`${enquiry.firstName} ${enquiry.lastName || ''}`}
                  disabled
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <TextInput
                  id="email"
                  value={enquiry.email}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <TextInput
                  id="phone"
                  value={enquiry.phoneNumber || 'N/A'}
                  disabled
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="enquiryType">Enquiry Type</Label>
                <TextInput
                  id="enquiryType"
                  value={formatEnquiryType(enquiry.enquiryType)}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <TextInput
                id="subject"
                value={enquiry.subject}
                disabled
                readOnly
              />
            </div>

            {enquiry.property && (
              <div>
                <Label htmlFor="property">Property</Label>
                <TextInput
                  id="property"
                  value={enquiry.property.slug || 'N/A'}
                  disabled
                  readOnly
                />
              </div>
            )}

            {enquiry.eventDate && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDate">Event Date</Label>
                  <TextInput
                    id="eventDate"
                    value={formatAdminDate(enquiry.eventDate)}
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="guestCount">Guest Count</Label>
                  <TextInput
                    id="guestCount"
                    value={enquiry.guestCount?.toString() || 'N/A'}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            )}

            {(enquiry.checkinDate || enquiry.checkoutDate) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkinDate">Check-in Date</Label>
                  <TextInput
                    id="checkinDate"
                    value={formatAdminDate(enquiry.checkinDate)}
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="checkoutDate">Check-out Date</Label>
                  <TextInput
                    id="checkoutDate"
                    value={formatAdminDate(enquiry.checkoutDate)}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={enquiry.message}
                disabled
                readOnly
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createdAt">Created At</Label>
                <TextInput
                  id="createdAt"
                  value={formatAdminDateTime(enquiry.createdAt)}
                  disabled
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="spam">Spam</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="responseMessage">Response Message</Label>
              <Textarea
                id="responseMessage"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Enter response message..."
                rows={3}
              />
            </div>

            {enquiry.responseDate && (
              <div>
                <Label htmlFor="responseDate">Response Date</Label>
                <TextInput
                  id="responseDate"
                  value={formatAdminDateTime(enquiry.responseDate)}
                  disabled
                  readOnly
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Button onClick={handleStatusUpdate} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
            <Button color="gray" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
