"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, Button, FileInput, TextInput, ToggleSwitch } from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";
import {
  getPropertyGstStatus,
  updatePropertyGstStatus,
} from "@/actions/propertyGstStatusActions";
import { uploadPropertyGstCertificateAction } from "@/actions/imageActions";
import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";

export default function PropertyGstStatusSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [savedRegistered, setSavedRegistered] = useState(false);
  const [savedGstNumber, setSavedGstNumber] = useState("");
  const [savedCertificateUrl, setSavedCertificateUrl] = useState<string | null>(
    null,
  );

  const [isPropertyGstRegistered, setIsPropertyGstRegistered] = useState(false);
  const [propertyGstNumber, setPropertyGstNumber] = useState("");
  const [propertyGstCertificateUrl, setPropertyGstCertificateUrl] = useState<
    string | null
  >(null);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      setLoading(true);
      try {
        const data = await getPropertyGstStatus(propertyId);
        if (!mounted) return;
        const number = data.propertyGstNumber ?? "";
        const certificateUrl = data.propertyGstCertificateUrl ?? null;
        setSavedRegistered(data.isPropertyGstRegistered);
        setSavedGstNumber(number);
        setSavedCertificateUrl(certificateUrl);
        setIsPropertyGstRegistered(data.isPropertyGstRegistered);
        setPropertyGstNumber(number);
        setPropertyGstCertificateUrl(certificateUrl);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load GST status",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStatus();
    return () => {
      mounted = false;
    };
  }, [propertyId]);

  const hasChanges =
    savedRegistered !== isPropertyGstRegistered ||
    savedGstNumber !== propertyGstNumber.trim() ||
    savedCertificateUrl !== propertyGstCertificateUrl;

  async function handleCertificateUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", propertyId);
      const result = await uploadPropertyGstCertificateAction(formData);
      if (result.success?.url) {
        setPropertyGstCertificateUrl(result.success.url);
        toast.success("GST certificate uploaded.");
      } else {
        toast.error(result.error || "Failed to upload GST certificate");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload GST certificate",
      );
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function saveStatus() {
    const trimmedNumber = propertyGstNumber.trim();

    if (isPropertyGstRegistered) {
      if (!trimmedNumber) {
        toast.error("GST Number is required when the property is GST registered.");
        return;
      }
      if (!propertyGstCertificateUrl) {
        toast.error(
          "GST Certificate is required when the property is GST registered.",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const data = await updatePropertyGstStatus({
        propertyId,
        isPropertyGstRegistered,
        propertyGstNumber: isPropertyGstRegistered ? trimmedNumber : null,
        propertyGstCertificateUrl: isPropertyGstRegistered
          ? propertyGstCertificateUrl
          : null,
      });
      const number = data.propertyGstNumber ?? "";
      const certificateUrl = data.propertyGstCertificateUrl ?? null;
      setSavedRegistered(data.isPropertyGstRegistered);
      setSavedGstNumber(number);
      setSavedCertificateUrl(certificateUrl);
      setIsPropertyGstRegistered(data.isPropertyGstRegistered);
      setPropertyGstNumber(number);
      setPropertyGstCertificateUrl(certificateUrl);
      toast.success("GST status updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update GST status",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <SectionHeading
        title="GST Status"
        description="Control whether this property is GST registered. This applies across all brands and is snapshotted into bookings for finance calculations."
        className="mb-0"
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <JarvisLoader size="md" />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Property GST Registered
                </p>
                <Badge color={isPropertyGstRegistered ? "success" : "warning"}>
                  {isPropertyGstRegistered ? "Registered" : "Not Registered"}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This value is snapshotted into bookings and used while deciding
                GST liability in booking finance.
              </p>
            </div>

            <ToggleSwitch
              checked={isPropertyGstRegistered}
              onChange={(checked) => {
                setIsPropertyGstRegistered(checked);
                if (!checked) {
                  setPropertyGstNumber("");
                  setPropertyGstCertificateUrl(null);
                }
              }}
            />
          </div>

          {isPropertyGstRegistered ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <LabelWrapper label="GST Number *">
                <TextInput
                  id="propertyGstNumber"
                  name="propertyGstNumber"
                  value={propertyGstNumber}
                  onChange={(e) => setPropertyGstNumber(e.target.value)}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  required
                />
              </LabelWrapper>

              <LabelWrapper label="GST Certificate *">
                <div className="space-y-2">
                  <FileInput
                    id="propertyGstCertificate"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleCertificateUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Uploading certificate…
                    </p>
                  ) : propertyGstCertificateUrl ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Certificate uploaded.{" "}
                      <a
                        href={propertyGstCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View file
                      </a>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Upload a PDF or image of the GST certificate.
                    </p>
                  )}
                </div>
              </LabelWrapper>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button
              color="blue"
              disabled={!hasChanges || saving || uploading}
              onClick={saveStatus}
            >
              Save GST Status
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
