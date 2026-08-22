"use client";

import { deleteProposal } from "@/actions/proposalActions";

import { toast } from "react-hot-toast";

interface DeleteProposalButtonProps {
    id: string;
}

export default function DeleteProposalButton({ id }: DeleteProposalButtonProps) {
    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this proposal? This action cannot be undone.")) {
            const res = await deleteProposal(id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Proposal deleted successfully");
            }
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="font-medium text-red-600 hover:underline dark:text-red-500 ml-4 cursor-pointer bg-transparent border-0 p-0"
        >
            Delete
        </button>
    );
}
