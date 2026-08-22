import ProposalBuilder from "@/components/ProposalBuilder";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

export default async function CreateMagoProposalPage() {
    return (
        <div className="p-4">
            <h1 className="mb-6 text-2xl font-bold dark:text-white">Create New Mago Proposal</h1>
            <ProposalBuilder
                brandName={CUSTOMER_BRANDS.MAGO}
                basePath="/admin/mago-proposals"
            />
        </div>
    );
}
