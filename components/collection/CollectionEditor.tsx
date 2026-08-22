"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { createCollection, editCollection } from "@/actions/collectionActions";
import { getPropertiesByIds, searchPropertiesWithIds } from "@/actions/propertyActions";
import { uploadCollectionLogoAction } from "@/actions/imageActions";
import { useCollectionForm } from "@/hooks/useCollectionForm";
import {
  COLLECTION_ADMIN_APP_TYPE,
  COLLECTION_LIST_BASE_PATH,
  COLLECTIONS_ERRORS,
  type CollectionAdminScope,
  type TabType,
} from "@/constants/collections";
import MyButton from "@/components/MyButton";
import DeleteCollectionButton from "@/components/collection/DeleteCollectionButton";
import type { Collection } from "@/utils/types";

import CollectionTabs from "@/components/collection/CollectionTabs";
import CollectionBasicInfo, { type BasicInfoState } from "@/components/collection/CollectionBasicInfo";
import CollectionMeta, { type MetaState } from "@/components/collection/CollectionMeta";
import CollectionFAQs, { type FAQ } from "@/components/collection/CollectionFAQs";
import CollectionInfoSections, { type Info } from "@/components/collection/CollectionInfoSections";
import CollectionProperties, { type PropertySelection } from "@/components/collection/CollectionProperties";

function generateSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface CollectionEditorProps {
  data?: Collection;
  adminScope?: CollectionAdminScope;
}

export default function CollectionEditor({
  data,
  adminScope = "instafarms",
}: CollectionEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const { errors, validateAll, clearFieldError } = useCollectionForm();

  const brandAppType = COLLECTION_ADMIN_APP_TYPE[adminScope];
  const propertyApiOpts = useMemo(() => ({ appType: brandAppType }), [brandAppType]);
  const listPath = COLLECTION_LIST_BASE_PATH[adminScope];

  const [activeTab, setActiveTab] = useState<TabType>("basic");

  const [basicState, setBasicState] = useState<BasicInfoState>({
    name: data?.name || "",
    description: data?.description || "",
    heading: data?.heading || "",
    slug: data?.slug || "",
    weight: data?.weight?.toString() || "0",
    hpc: data?.hpc?.toString() || "",
    logo: data?.logo || "",
    altText: data?.altText || "",
    isActive: data?.isActive ?? true,
  });

  const [metaState, setMetaState] = useState<MetaState>({
    metaTitle: data?.meta?.metaTitle || "",
    metaDescription: data?.meta?.metaDescription || "",
    metaUrl: data?.meta?.metaUrl || "",
    metaImage: data?.meta?.metaImage || "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(data?.logo || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [faqs, setFaqs] = useState<FAQ[]>(
    Array.isArray(data?.faqs) ? data.faqs : []
  );
  const [infos, setInfos] = useState<Info[]>(
    Array.isArray(data?.info)
      ? data.info.map(i => ({ ...i, sectionType: i.sectionType || "text" }))
      : []
  );

  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(
    Array.isArray(data?.properties) ? data.properties.map((p) => p.id) : []
  );
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState<PropertySelection[]>([]);
  const [availableProperties, setAvailableProperties] = useState<PropertySelection[]>([]);
  const [propertySearchTerm, setPropertySearchTerm] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(false);

  const updateBasic = (field: keyof BasicInfoState, value: string | boolean) => {
    setBasicState(prev => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string") next.slug = generateSlug(value);
      return next;
    });
    if (field === "name") clearFieldError("name");
    if (field === "weight") clearFieldError("weight");
  };

  const updateMeta = (field: keyof MetaState, value: string) =>
    setMetaState(prev => ({ ...prev, [field]: value }));

  const handleLogoFileSelect = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview("");
    updateBasic("logo", "");
  };

  const addFaq = () => setFaqs(prev => [...prev, { question: "", answer: "", isActive: true, weight: 0 }]);
  const deleteFaq = (i: number) => setFaqs(prev => prev.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, field: keyof FAQ, value: string | boolean | number) =>
    setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));

  const addInfo = () => setInfos(prev => [...prev, { title: "", content: "", sectionType: "text", isPublished: true }]);
  const deleteInfo = (i: number) => setInfos(prev => prev.filter((_, idx) => idx !== i));
  const updateInfo = (i: number, field: keyof Info, value: string | boolean) =>
    setInfos(prev => prev.map((inf, idx) => idx === i ? { ...inf, [field]: value } : inf));

  const syncPropertySelection = (updatedIds: string[]) => {
    setSelectedPropertyIds(updatedIds);
    setAvailableProperties(prev => prev.map(p => ({ ...p, isSelected: updatedIds.includes(p.id) })));
  };

  const handlePropertyToggle = (id: string) =>
    syncPropertySelection(
      selectedPropertyIds.includes(id)
        ? selectedPropertyIds.filter(pid => pid !== id)
        : [...selectedPropertyIds, id]
    );

  const handlePropertyRemove = (id: string) =>
    syncPropertySelection(selectedPropertyIds.filter(pid => pid !== id));

  const handleSelectAllProperties = () => {
    const visible = availableProperties.filter(p => !selectedPropertyIds.includes(p.id));
    const allSelected = visible.length > 0 && visible.every(p => p.isSelected);
    const visibleIds = visible.map(p => p.id);
    syncPropertySelection(
      allSelected
        ? selectedPropertyIds.filter(id => !visibleIds.includes(id))
        : [...new Set([...selectedPropertyIds, ...visibleIds])]
    );
  };

  useEffect(() => {
    if (selectedPropertyIds.length === 0) {
      setSelectedPropertyDetails([]);
      return;
    }
    getPropertiesByIds(selectedPropertyIds, propertyApiOpts).then(res => {
      if (!res.error && res.data) {
        setSelectedPropertyDetails(
          res.data.map((p: any) => ({
            id: p.id,
            name: p.propertyName || p.name || "",
            code: p.propertyCode || p.code || "",
            isSelected: true,
          }))
        );
      }
    });
  }, [selectedPropertyIds, propertyApiOpts]);

  useEffect(() => {
    if (activeTab !== "properties") return;
    const timer = setTimeout(async () => {
      if (!propertySearchTerm) {
        setAvailableProperties([]);
        return;
      }
      setLoadingProperties(true);
      try {
        const makeForm = (searchKey: "Property Name" | "Property Code") => {
          const f = new FormData();
          f.append("searchKey", searchKey);
          f.append("searchValue", propertySearchTerm);
          f.append("adminAppType", brandAppType);
          return f;
        };

        const [nameRes, codeRes] = await Promise.all([
          searchPropertiesWithIds(makeForm("Property Name")),
          searchPropertiesWithIds(makeForm("Property Code")),
        ]);

        const seen = new Set<string>();
        const merged = [...(nameRes.data || []), ...(codeRes.data || [])].filter((p: any) => {
          if (!p?.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        setAvailableProperties(
          merged
            .filter((p: any) => !selectedPropertyIds.includes(p.id))
            .map((p: any) => ({
              id: p.id,
              name: p.propertyName || p.name || "",
              code: p.propertyCode || p.code || "",
              isSelected: false,
            }))
        );
      } catch {
        toast.error(COLLECTIONS_ERRORS.fetchFailed);
      } finally {
        setLoadingProperties(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, propertySearchTerm, selectedPropertyIds, brandAppType]);

  const handleSubmit = async (_: FormData) => {
    if (!validateAll({ name: basicState.name, slug: basicState.slug, weight: basicState.weight })) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    let logoUrl = basicState.logo;

    // EDIT: id already exists, upload immediately.
    if (data && logoFile) {
      try {
        setUploadingLogo(true);
        const uploadFormData = new FormData();
        uploadFormData.append("file", logoFile);
        uploadFormData.append("scope", adminScope);
        uploadFormData.append("collectionId", data.id);
        const result = await uploadCollectionLogoAction(uploadFormData);
        if (result.error || !result.success) {
          toast.error(result.error || COLLECTIONS_ERRORS.logoUploadFailed);
          return;
        }
        logoUrl = result.success.path;
        updateBasic("logo", logoUrl);
      } catch {
        toast.error(COLLECTIONS_ERRORS.logoUploadFailed);
        return;
      } finally {
        setUploadingLogo(false);
      }
    }

    const buildFormData = (logo: string) => {
      const fd = new FormData();
      fd.set("collectionAdminScope", adminScope);
      fd.set("name", basicState.name);
      fd.set("description", basicState.description);
      fd.set("heading", basicState.heading);
      fd.set("slug", basicState.slug);
      fd.set("weight", basicState.weight);
      fd.set("hpc", basicState.hpc);
      fd.set("logo", logo);
      fd.set("altText", basicState.altText);
      fd.set("isActive", basicState.isActive ? "true" : "false");
      fd.set("metaTitle", metaState.metaTitle);
      fd.set("metaDescription", metaState.metaDescription);
      fd.set("metaUrl", metaState.metaUrl);
      fd.set("metaImage", metaState.metaImage);
      fd.append("faqs", JSON.stringify(faqs));
      fd.append("info", JSON.stringify(infos));
      fd.append("properties", JSON.stringify(selectedPropertyIds.map(id => ({ id }))));
      return fd;
    };

    startTransition(() => {
      const run = async (): Promise<string> => {
        if (data) {
          const res = await editCollection(data.id, buildFormData(logoUrl));
          if (res.error) throw new Error(res.error);
          return res.success ?? "Updated.";
        }

        // CREATE: create first without a logo, then upload + patch if a file was staged.
        const created = await createCollection(buildFormData(""));
        if (created.error) throw new Error(created.error);
        const newId = created.data?.id;

        if (logoFile && newId) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", logoFile);
          uploadFormData.append("scope", adminScope);
          uploadFormData.append("collectionId", newId);
          const uploadResult = await uploadCollectionLogoAction(uploadFormData);
          if (uploadResult.error || !uploadResult.success) {
            throw new Error(uploadResult.error || COLLECTIONS_ERRORS.logoUploadFailed);
          }
          const patchRes = await editCollection(newId, buildFormData(uploadResult.success.path));
          if (patchRes.error) throw new Error(patchRes.error);
        }

        return created.success ?? "Created.";
      };

      const promise = run();
      toast.promise(promise, {
        loading: data ? "Updating collection…" : "Creating collection…",
        success: msg => { router.push(listPath); return msg; },
        error: err => (err as Error).message,
      });
    });
  };

  const tabContent: Record<TabType, ReactNode> = {
    basic: (
      <CollectionBasicInfo
        state={basicState}
        errors={errors}
        logoPreview={logoPreview}
        uploading={uploadingLogo}
        onChange={updateBasic}
        onLogoFileSelect={handleLogoFileSelect}
        onLogoRemove={handleLogoRemove}
      />
    ),
    meta: <CollectionMeta state={metaState} onChange={updateMeta} />,
    faqs: <CollectionFAQs faqs={faqs} onAdd={addFaq} onDelete={deleteFaq} onUpdate={updateFaq} />,
    info: <CollectionInfoSections infos={infos} onAdd={addInfo} onDelete={deleteInfo} onUpdate={updateInfo} />,
    properties: (
      <CollectionProperties
        selectedIds={selectedPropertyIds}
        selectedDetails={selectedPropertyDetails}
        availableProperties={availableProperties}
        searchTerm={propertySearchTerm}
        loading={loadingProperties}
        onSearchChange={setPropertySearchTerm}
        onToggle={handlePropertyToggle}
        onRemove={handlePropertyRemove}
        onSelectAll={handleSelectAllProperties}
      />
    ),
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <form action={handleSubmit} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <CollectionTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="py-4">{tabContent[activeTab]}</div>

        <div className="flex justify-center items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
          <MyButton type="submit" loading={loading || uploadingLogo}>
            {uploadingLogo ? "Uploading…" : "Submit"}
          </MyButton>
          {data?.id && (
            <div onClick={e => e.preventDefault()}>
              <DeleteCollectionButton id={data.id} adminScope={adminScope} />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
