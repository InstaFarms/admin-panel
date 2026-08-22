"use server";

import { revalidatePath } from "next/cache";

import { getApiAuthToken } from "@/utils/auth-utils";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

export interface ProposalItemInput {
    propertyId: string;
    order: number;
}

export interface CreateProposalInput {
    brandId?: string;
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
    items: ProposalItemInput[];
}

interface ProposalActionOptions {
    brandName?: string;
    basePath?: string;
}

const buildProposalQuery = (options?: ProposalActionOptions) => {
    if (!options?.brandName) return "";
    return `?brandName=${encodeURIComponent(options.brandName)}`;
};

const getBasePath = (options?: ProposalActionOptions) => options?.basePath || "/admin/proposals";

export const createProposal = async (input: CreateProposalInput, options?: ProposalActionOptions) => {
    try {
        const token = await getApiAuthToken();
        if (!token) throw new Error("Unauthorized");

        const payload = options?.brandName ? { ...input, brandName: options.brandName } : input;
        const query = buildProposalQuery(options);
        const json = await apiPost<any>(`/api/proposals${query}`, payload, { token });
        revalidatePath(getBasePath(options));
        return { success: true, proposalId: json.proposalId };
    } catch (error: any) {
        console.error("Error creating proposal:", error);
        captureError(error);
        return { error: error.message };
    }
};

export const getProposals = async (options?: ProposalActionOptions) => {
    try {
        const token = await getApiAuthToken();
        if (!token) return [];

        const query = buildProposalQuery(options);
        const json = await apiGet<any>(`/api/proposals${query}`, { token, cache: "no-store" });
        return json.data || [];
    } catch (error) {
        console.error("Error fetching proposals:", error);
        captureError(error);
        return [];
    }
};

export const getProposalById = async (id: string, options?: ProposalActionOptions) => {
    try {
        const token = await getApiAuthToken();
        if (!token) return null;

        const query = buildProposalQuery(options);
        const json = await apiGet<any>(`/api/proposals/${id}${query}`, { token, cache: "no-store" });
        return json.data || null;
    } catch (error) {
        console.error("Error fetching proposal:", error);
        captureError(error);
        return null;
    }
};

export const updateProposalItems = async (
    proposalId: string,
    items: ProposalItemInput[],
    options?: ProposalActionOptions
) => {
    try {
        const token = await getApiAuthToken();
        if (!token) throw new Error("Unauthorized");

        const query = buildProposalQuery(options);
        await apiPatch(`/api/proposals/${proposalId}/items${query}`, items, { token });

        revalidatePath(`${getBasePath(options)}/${proposalId}`);
        return { success: true };
    } catch (error: any) {
        captureError(error);
        return { error: error.message };
    }
};

export const deleteProposal = async (id: string, options?: ProposalActionOptions) => {
    try {
        const token = await getApiAuthToken();
        if (!token) throw new Error("Unauthorized");

        const query = buildProposalQuery(options);
        await apiDelete(`/api/proposals/${id}${query}`, { token });

        revalidatePath(getBasePath(options));
        return { success: true };
    } catch (error: any) {
        captureError(error);
        return { error: error.message };
    }
}

export const updateProposal = async (id: string, input: Partial<CreateProposalInput>, options?: ProposalActionOptions) => {
    try {
        const token = await getApiAuthToken();
        if (!token) throw new Error("Unauthorized");

        const payload = options?.brandName ? { ...input, brandName: options.brandName } : input;
        const query = buildProposalQuery(options);
        console.log(`[Action] Updating proposal ${id}:`, JSON.stringify(payload, null, 2));
        await apiPatch(`/api/proposals/${id}${query}`, payload, { token });

        revalidatePath(getBasePath(options));
        revalidatePath(`${getBasePath(options)}/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating proposal:", error);
        captureError(error);
        return { error: error.message };
    }
};
