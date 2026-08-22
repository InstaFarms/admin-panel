"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { HiPencil, HiTrash, HiDocumentDuplicate } from "react-icons/hi";
import { toast } from "react-hot-toast";

import { deleteProposal } from "@/actions/proposalActions";
import { CustomerBrandName } from "@/constants/customerBrands";

interface ProposalActionsMenuProps {
    proposalId: string;
    slug?: string | null;
    brandName?: CustomerBrandName;
    basePath?: string;
}

export default function ProposalActionsMenu({
    proposalId,
    slug,
    brandName,
    basePath = "/admin/proposals"
}: ProposalActionsMenuProps) {
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this proposal? This action cannot be undone.")) return;
        const res = await deleteProposal(proposalId, { brandName, basePath });
        if (res.error) toast.error(res.error);
        else {
            toast.success("Proposal deleted successfully");
            router.refresh();
        }
    };
    const handleCopyLink = async () => {
        if (!slug) {
            toast.error("Can't copy link. Slug not found for this proposal.");
            return;
        }

        const domain = brandName === "Instafarms" ? "instafarms.in" : "magostays.com";

        const url = `https://${domain}/proposals/${slug}`;

        try {
            await navigator.clipboard.writeText(url);
            toast.success("Proposal link copied to clipboard");
        } catch (err) {
            console.error("Failed to copy link:", err);
            toast.error("Failed to copy link");
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Link href={`${basePath}/${proposalId}`} title="Edit">
                <div className="rounded-md bg-blue-600 p-1.5 transition-colors hover:bg-blue-700 cursor-pointer">
                    <HiPencil size={18} className="text-white" />
                </div>
            </Link>
            <button
                onClick={handleCopyLink}
                title="Copy Link"
                className="rounded-md bg-gray-600 p-1.5 transition-colors hover:bg-gray-700 cursor-pointer border-none"
            >
                <HiDocumentDuplicate size={18} className="text-white" />
            </button>
            <button
                onClick={handleDelete}
                title="Delete"
                className="rounded-md bg-red-600 p-1.5 transition-colors hover:bg-red-700 cursor-pointer border-none"
            >
                <HiTrash size={18} className="text-white" />
            </button>
        </div>
    );
}
