import ProposalBuilder from "@/components/ProposalBuilder";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

export default async function CreateInstafarmsProposalPage() {
    return (
        <div className="p-4">
            <h1 className="mb-6 text-2xl font-bold dark:text-white">Create New Instafarms Proposal</h1>
            <ProposalBuilder
                brandName={CUSTOMER_BRANDS.INSTAFARMS}
                basePath="/admin/instafarms-proposals"
            />
        </div>
    );
}
