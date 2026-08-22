import ProposalBuilder from "@/components/ProposalBuilder";
import { getProposalById } from "@/actions/proposalActions";
import { notFound } from "next/navigation";
import { SortableProperty, ServerPageProps } from "@/utils/types";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

export default async function EditMagoProposalPage({ params }: ServerPageProps) {
    const { id } = await params;
    const idStr = typeof id === "string" ? id : id?.[0];
    if (!idStr) notFound();

    const proposal = await getProposalById(idStr, { brandName: CUSTOMER_BRANDS.MAGO });

    if (!proposal) {
        notFound();
    }

    function normalizePropertyData(prop: any): SortableProperty {
        let gallery = [];
        if (prop.gallery && Array.isArray(prop.gallery) && prop.gallery.length > 0) {
            gallery = prop.gallery.map((g: any) => ({
                ...g,
                url: g.url || g.photoUrl || g.rawUrl || "/logo.jpg"
            }));
        } else if (prop.featured_image) {
            gallery = [{
                ...prop.featured_image,
                url: prop.featured_image.url || prop.featured_image.photoUrl || prop.featured_image.rawUrl || "/logo.jpg"
            }];
        }

        const area = typeof prop.area === "object" ? (prop.area?.area || prop.area?.name || "") : (prop.area || "");
        const city = typeof prop.city === "object" ? (prop.city?.city || prop.city?.name || "") : (prop.city || "");

        const normalized = {
            ...prop,
            propertyName: prop.name || prop.heading || prop.propertyName || "",
            propertyCode: prop.code_name || prop.property_code_name || prop.propertyCode || "",
            area,
            city,
            gallery,
        };

        return normalized as SortableProperty;
    }

    const initialData = {
        id: proposal.id,
        customerId: proposal.customerId as string,
        notes: proposal.notes || "",
        validTill: proposal.validTill ? proposal.validTill : undefined,
        customerFirstName: proposal.customerFirstName || "",
        customerLastName: proposal.customerLastName,
        checkinDate: proposal.checkinDate,
        checkoutDate: proposal.checkoutDate,
        adultCount: proposal.adultCount,
        childrenCount: proposal.childrenCount,
        infantCount: proposal.infantCount,
        floatingAdultCount: proposal.floatingAdultCount,
        floatingChildrenCount: proposal.floatingChildrenCount,
        floatingInfantCount: proposal.floatingInfantCount,
        items: (proposal.items || []).map((item: any) => ({
            order: item.order,
            property: normalizePropertyData(item.property)
        }))
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold dark:text-white">Edit Mago Proposal</h1>
                <p className="text-gray-500 text-sm">Update existing proposal details.</p>
            </div>
            <ProposalBuilder
                initialData={initialData}
                brandName={CUSTOMER_BRANDS.MAGO}
                basePath="/admin/mago-proposals"
            />
        </div>
    );
}
