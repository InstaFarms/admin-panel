"use server";

import { revalidatePath } from "next/cache";

import { captureError } from "@/lib/sentry";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { uploadSettingAssetAction } from "@/actions/imageActions";
import { v4 as uuidv4 } from "uuid";
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import {
  BRAND_ADMIN_APP_TYPE,
  BRAND_CONTENT_HUB,
  type BrandAdminScope,
} from "@/constants/brandAdminScope";

function revalidateBrandContentHub(scope: BrandAdminScope) {
  revalidatePath(BRAND_CONTENT_HUB[scope]);
  revalidatePath("/admin");
}

export interface CreateCmsInput {
    title: string;
    heading: string;
    subHeading?: string;
    content: string;
    isActive: boolean;
    slug: string;
    meta: {
        metaTitle: string;
        metaDescription: string;
        metaUrl: string;
        metaImage: string;
    };
}

export interface UpdateCmsInput {
    title?: string;
    heading?: string;
    subHeading?: string;
    content?: string;
    isActive?: boolean;
    slug?: string;
    meta?: {
        metaTitle: string;
        metaDescription: string;
        metaUrl: string;
        metaImage: string;
    };
}


export const createCms = async (
    formData: FormData,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        const appType = BRAND_ADMIN_APP_TYPE[scope];

        const title = parseString(formData.get("title")?.toString());
        const heading = parseString(formData.get("heading")?.toString());
        const subHeading = parseString(formData.get("subHeading")?.toString());
        const content = parseString(formData.get("content")?.toString());
        const isActive = formData.get("isActive") === "true";
        const metaTitle = parseString(formData.get("metaTitle")?.toString());
        const metaDescription = parseString(formData.get("metaDescription")?.toString());
        const metaUrl = parseString(formData.get("metaUrl")?.toString());
        const metaImage = parseString(formData.get("metaImage")?.toString());

        if (!title || !heading || !content) {
            return { error: "Please fill in all required fields." };
        }

        const slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();

        // ✅ CHANGE: Use "metadata" instead of "meta"
        const metadata = {
            metaTitle: metaTitle || "",
            metaDescription: metaDescription || "",
            metaUrl: metaUrl || "",
            metaImage: metaImage || "",
        };

        const insertData = {
            title,
            heading,
            content,
            ...(subHeading ? { subHeading } : {}),
            isActive,
            slug,
            metadata,  // ✅ Changed from "meta" to "metadata"
        };

        await apiPost("/api/cms", insertData, { token, appType });

        revalidateBrandContentHub(scope);
        return { success: "Created new CMS content." };

    } catch (err) {
        console.error("CMS creation error:", err);
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const editCms = async (
    id: string,
    formData: FormData,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        const appType = BRAND_ADMIN_APP_TYPE[scope];

        const title = parseString(formData.get("title")?.toString());
        const heading = parseString(formData.get("heading")?.toString());
        const subHeading = parseString(formData.get("subHeading")?.toString());
        const content = parseString(formData.get("content")?.toString());
        const isActive = formData.get("isActive") === "true";
        const metaTitle = parseString(formData.get("metaTitle")?.toString());
        const metaDescription = parseString(formData.get("metaDescription")?.toString());
        const metaUrl = parseString(formData.get("metaUrl")?.toString());
        const metaImage = parseString(formData.get("metaImage")?.toString());

        if (!id) {
            return { error: "Invalid id." };
        }

        if (!title || !heading || !content) {
            return { error: "Please fill in all required fields." };
        }

        const slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();

        // ✅ CHANGE: Use "metadata" instead of "meta"
        const metadata = {
            metaTitle: metaTitle || "",
            metaDescription: metaDescription || "",
            metaUrl: metaUrl || "",
            metaImage: metaImage || "",
        };

        const updateData = {
            title,
            heading,
            ...(subHeading ? { subHeading } : {}),
            isActive,
            content,
            slug,
            metadata,  // ✅ Changed from "meta" to "metadata"
        };

        await apiPatch(`/api/cms/${id}`, updateData, { token, appType });

        revalidateBrandContentHub(scope);
        return { success: "CMS content updated." };

    } catch (err) {
        console.error("CMS edit error:", err);
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const deleteCms = async (
    id: string,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        if (!id) {
            return { error: "Invalid id." };
        }

        await apiDelete(`/api/cms/${id}`, { token, appType: BRAND_ADMIN_APP_TYPE[scope] });

        revalidateBrandContentHub(scope);
        return { success: "CMS content deleted." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

// Carousel Actions
export const createCarousel = async (
    formData: FormData,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        const appType = BRAND_ADMIN_APP_TYPE[scope];

        const heading = parseString(formData.get("heading")?.toString());
        const subHeading = parseString(formData.get("subHeading")?.toString());
        const weight = parseInt(formData.get("weight")?.toString() || "0");
        const slug = parseString(formData.get("slug")?.toString());
        const desktopBanner = formData.get("desktopBanner") as File | null;
        const mobileBanner = formData.get("mobileBanner") as File | null;
        const type = parseString(formData.get("type")?.toString()) || "WEB";

        if (!heading) {
            return { error: "Please enter heading." };
        }

        let bannerUrl = "";
        let mobBannerUrl = "";
        // No carousel id exists yet at create time — mint one just for the storage key.
        const filenameId = uuidv4();

        // Handle image uploads
        if (desktopBanner && desktopBanner.size > 0) {
            try {
                const fd = new FormData();
                fd.append("file", desktopBanner);
                fd.append("brandName", scope);
                fd.append("category", "carousel");
                fd.append("slot", `${filenameId}-desktop`);
                const uploadResult = await uploadSettingAssetAction(fd);
                if (uploadResult.error || !uploadResult.success) throw new Error(uploadResult.error || "Desktop banner upload failed");
                bannerUrl = uploadResult.success.url;
            } catch (error) {
                console.error('Error uploading desktop banner:', error);
                captureError(error);
            }
        }

        if (mobileBanner && mobileBanner.size > 0) {
            try {
                const fd = new FormData();
                fd.append("file", mobileBanner);
                fd.append("brandName", scope);
                fd.append("category", "carousel");
                fd.append("slot", `${filenameId}-mobile`);
                const uploadResult = await uploadSettingAssetAction(fd);
                if (uploadResult.error || !uploadResult.success) throw new Error(uploadResult.error || "Mobile banner upload failed");
                mobBannerUrl = uploadResult.success.url;
            } catch (error) {
                console.error('Error uploading mobile banner:', error);
                captureError(error);
            }
        }

        const insertData = {
            heading,
            subHeading,
            weight,
            slug,
            bannerUrl,
            mobBannerUrl,
            type,
        };

        await apiPost("/api/carousel", insertData, {
            token,
            appType,
            headers: { "X-Use-New-Schema": "true" },
        });

        revalidateBrandContentHub(scope);
        return { success: "Created new carousel item." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const editCarousel = async (
    id: string,
    formData: FormData,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        const appType = BRAND_ADMIN_APP_TYPE[scope];

        const heading = parseString(formData.get("heading")?.toString());
        const subHeading = parseString(formData.get("subHeading")?.toString());
        const weight = parseInt(formData.get("weight")?.toString() || "0");
        const slug = parseString(formData.get("slug")?.toString());
        const desktopBanner = formData.get("desktopBanner") as File | null;
        const mobileBanner = formData.get("mobileBanner") as File | null;
        const type = parseString(formData.get("type")?.toString());

        if (!id) {
            return { error: "Invalid id." };
        }

        if (!heading) {
            return { error: "Please enter heading." };
        }

        const updateData: any = {
            heading,
            subHeading,
            weight,
            slug,
            type,
        };

        if (desktopBanner && desktopBanner.size > 0) {
            try {
                const fd = new FormData();
                fd.append("file", desktopBanner);
                fd.append("brandName", scope);
                fd.append("category", "carousel");
                fd.append("slot", `${id}-desktop`);
                const uploadResult = await uploadSettingAssetAction(fd);
                if (uploadResult.error || !uploadResult.success) throw new Error(uploadResult.error || "Desktop banner upload failed");
                updateData.bannerUrl = uploadResult.success.url;
            } catch (error) {
                console.error('Error uploading desktop banner:', error);
                captureError(error);
            }
        }

        if (mobileBanner && mobileBanner.size > 0) {
            try {
                const fd = new FormData();
                fd.append("file", mobileBanner);
                fd.append("brandName", scope);
                fd.append("category", "carousel");
                fd.append("slot", `${id}-mobile`);
                const uploadResult = await uploadSettingAssetAction(fd);
                if (uploadResult.error || !uploadResult.success) throw new Error(uploadResult.error || "Mobile banner upload failed");
                updateData.mobBannerUrl = uploadResult.success.url;
            } catch (error) {
                console.error('Error uploading mobile banner:', error);
                captureError(error);
            }
        }

        await apiPatch(`/api/carousel/${id}`, updateData, {
            token,
            appType,
            headers: { "X-Use-New-Schema": "true" },
        });

        revalidateBrandContentHub(scope);
        return { success: "Carousel item updated." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const removeCarouselImage = async (
    carouselId: string,
    imageKey: 'desktop_banner' | 'mobile_banner',
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }

        const apiImageKey = imageKey === 'desktop_banner' ? 'bannerUrl' : 'mobBannerUrl';

        await apiDelete(`/api/carousel/${carouselId}/image`, {
            token,
            appType: BRAND_ADMIN_APP_TYPE[scope],
            headers: { "Content-Type": "application/json", "X-Use-New-Schema": "true" },
            body: JSON.stringify({ key: apiImageKey }),
        });

        revalidateBrandContentHub(scope);
        return { success: "Image removed successfully." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const deleteCarousel = async (
    id: string,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        if (!id) {
            return { error: "Invalid id." };
        }

        await apiDelete(`/api/carousel/${id}`, {
            token,
            appType: BRAND_ADMIN_APP_TYPE[scope],
            headers: { "X-Use-New-Schema": "true" },
        });

        revalidateBrandContentHub(scope);
        return { success: "Carousel item deleted." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

// Tags Actions
export const createTag = async (
    formData: FormData,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        const appType = BRAND_ADMIN_APP_TYPE[scope];

        const name = parseString(formData.get("name")?.toString());
        const color = parseString(formData.get("color")?.toString()) ?? undefined;

        if (!name) {
            return { error: "Please enter tag name." };
        }

        const insertData = {
            name,
            color,
        };

        await apiPost("/api/tags", insertData, { token, appType });

        revalidateBrandContentHub(scope);
        return { success: "Created new tag." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const editTag = async (
    id: string,
    formData: FormData,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        const appType = BRAND_ADMIN_APP_TYPE[scope];

        const name = parseString(formData.get("name")?.toString());
        const color = parseString(formData.get("color")?.toString()) ?? undefined;

        if (!id) {
            return { error: "Invalid id." };
        }

        if (!name) {
            return { error: "Please enter tag name." };
        }

        const updateData = {
            name,
            color,
        };

        await apiPatch(`/api/tags/${id}`, updateData, { token, appType });

        revalidateBrandContentHub(scope);
        return { success: "Tag updated." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};

export const deleteTag = async (
    id: string,
    scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
    try {
        const token = await getApiAuthToken();
        if (!token) {
            throw new Error("Unauthorized");
        }
        if (!id) {
            return { error: "Invalid id." };
        }

        await apiDelete(`/api/tags/${id}`, { token, appType: BRAND_ADMIN_APP_TYPE[scope] });

        revalidateBrandContentHub(scope);
        return { success: "Tag deleted." };

    } catch (err) {
        captureError(err);
        if (err instanceof Error) {
            return { error: err.message };
        } else {
            return { error: "Server Error." };
        }
    }
};


// Getters
export const getCmsList = async (
    limit: number,
    offset: number,
    scope: BrandAdminScope = "instafarms",
) => {
    const token = await getApiAuthToken();
    if (!token) return { data: [] };

    try {
        const json = await apiPost<any>(
            "/api/cms/paginate",
            { perPage: limit, pageNumber: Math.floor(offset / limit) + 1 },
            { token, cache: "no-store", appType: BRAND_ADMIN_APP_TYPE[scope] }
        );
        return { data: json?.data || [] };
    } catch (err) {
        console.error("Error getting CMS list:", err);
        captureError(err);
        return { data: [] };
    }
};

export const getCmsById = async (id: string, scope: BrandAdminScope = "instafarms") => {
    const token = await getApiAuthToken();
    if (!token) return null;
    try {
        const json = await apiGet<any>(`/api/cms/${id}`, {
          token,
          cache: "no-store",
          appType: BRAND_ADMIN_APP_TYPE[scope],
        });
        console.log("[GET_CMS_BY_ID] Raw response:", JSON.stringify(json, null, 2));
        
        const data = json?.data;

        // Map the API response to match CMS type
        if (data?.id && data?.title) {
            return {
                ...data,
                meta: data.meta || {},  // API returns `meta`
            };
        }
        
        return null;
    } catch (err) {
        console.error("Error getting CMS by ID:", err);
        captureError(err);
        return null;
    }
};


export const getTagsList = async (
    limit: number,
    offset: number,
    scope: BrandAdminScope = "instafarms",
) => {
    const token = await getApiAuthToken();
    if (!token) return { data: [] };

    try {
        const json = await apiPost<any>(
            "/api/tags/paginate",
            { perPage: limit, pageNumber: Math.floor(offset / limit) + 1 },
            { token, cache: "no-store", appType: BRAND_ADMIN_APP_TYPE[scope] }
        );
        return { data: json.data || [] };
    } catch (err) {
        console.error("Error getting Tags list:", err);
        captureError(err);
        return { data: [] };
    }
};

export const getTagById = async (id: string, scope: BrandAdminScope = "instafarms") => {
    const token = await getApiAuthToken();
    if (!token) return null;

    try {
        const json = await apiGet<any>(`/api/tags/${id}`, {
          token,
          cache: "no-store",
          appType: BRAND_ADMIN_APP_TYPE[scope],
        });
        return json.data || null;
    } catch (err) {
        console.error("Error getting Tag by ID:", err);
        captureError(err);
        return null;
    }
};

export const getCarouselList = async (
    limit: number,
    offset: number,
    type: string = "WEB",
    scope: BrandAdminScope = "instafarms",
) => {
    const token = await getApiAuthToken();
    if (!token) return { data: [] };

    try {
        const payload: any = {
            perPage: limit,
            pageNumber: Math.floor(offset / limit) + 1,
            type
        };

        // For APP carousel, sort by creation date ascending (created first on top)
        if (type === "APP") {
            payload.orderBy = "createdAt";
            payload.sortorder = "asc";
        }

        const json = await apiPost<any>(
            "/api/carousel/paginate",
            payload,
            {
              token,
              cache: "no-store",
              appType: BRAND_ADMIN_APP_TYPE[scope],
              headers: { "X-Use-New-Schema": "true" },
            }
        );
        console.log("[CARAOUSEL_PAGINATE]", json);
        return { data: json.data || [] };
    } catch (err) {
        console.error("Error getting Carousel list:", err);
        captureError(err);
        return { data: [] };
    }
};

export const getCarouselById = async (id: string, scope: BrandAdminScope = "instafarms") => {
    const token = await getApiAuthToken();
    if (!token) return null;

    try {
        const json = await apiGet<any>(`/api/carousel/${id}`, {
            token,
            cache: "no-store",
            appType: BRAND_ADMIN_APP_TYPE[scope],
            headers: { "X-Use-New-Schema": "true" },
        });
        console.log("[CARAOUSEL_ID]", json);
        // Carousel endpoint returns mapped data already

        // Fix: createCarousel uses bannerUrl/mobBannerUrl but the detail page rendering might expect desktopBannerUrl/mobileBannerUrl? 
        // In page.tsx (list), it uses desktopBannerUrl.
        // In API, it returns bannerUrl.
        // I should probably map it here or in page.

        // Let's map it here to match existing page expectation if needed, OR update page.
        // Existing page used: desktopBannerUrl, mobileBannerUrl
        // API returns: bannerUrl, mobBannerUrl
        // I will map it here to minimize page changes.
        const data = json.data;
        if (data) {
            return {
                ...data,
                desktopBannerUrl: data.bannerUrl,
                mobileBannerUrl: data.mobBannerUrl
            };
        }
        return null;
    } catch (err) {
        console.error("Error getting Carousel by ID:", err);
        captureError(err);
        return null;
    }
};
