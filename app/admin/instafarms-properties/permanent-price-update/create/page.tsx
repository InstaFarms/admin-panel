import PermanentPriceUpdateForm from "@/components/BulkPermanentUpdate/PermanentPriceUpdateForm";
import BulkSpecialDateBreadcrumb from "@/components/BulkSpecialDateUpdate/BulkSpecialDateBreadcrumb";

import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

import { getAllBrands } from "@/actions/brandActions";

export const dynamic = "force-dynamic";

export default async function InstafarmsPermanentPriceUpdateCreatePage() {
    const brands = await getAllBrands(["id", "name"]);
    const instafarmsBrand = brands.find((b: any) => b.name?.toLowerCase() === CUSTOMER_BRANDS.INSTAFARMS.toLowerCase());
    const brandId = instafarmsBrand?.id;

    const basePath = "/admin/instafarms-properties/permanent-price-update";
    const brandPropertiesPath = "/admin/properties";

    return (
        <div className="flex w-full flex-col gap-4">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Create Instafarms Permanent Price Update
            </h5>
            <BulkSpecialDateBreadcrumb
                isCreatePage={true}
                basePath={basePath}
                brandPropertiesPath={brandPropertiesPath}
            />
            <PermanentPriceUpdateForm
                brandName={CUSTOMER_BRANDS.INSTAFARMS}
                brandId={brandId}
                basePath={basePath}
            />
        </div>
    );
}
