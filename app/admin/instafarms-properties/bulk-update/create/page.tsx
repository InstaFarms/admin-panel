import BulkSpecialDateForm from "@/components/BulkSpecialDateUpdate/BulkSpecialDateForm";
import BulkSpecialDateBreadcrumb from "@/components/BulkSpecialDateUpdate/BulkSpecialDateBreadcrumb";

import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

import { getAllBrands } from "@/actions/brandActions";

export const dynamic = "force-dynamic";

export default async function InstafarmsBulkUpdateCreatePage() {
    const brands = await getAllBrands(["id", "name"]);
    const instafarmsBrand = brands.find((b: any) => b.name?.toLowerCase() === CUSTOMER_BRANDS.INSTAFARMS.toLowerCase());
    const brandId = instafarmsBrand?.id;

    const basePath = "/admin/instafarms-properties/bulk-update";
    const brandPropertiesPath = "/admin/properties";

    return (
        <div className="flex w-full flex-col gap-4">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Create Instafarms Bulk Special Date Update
            </h5>
            <BulkSpecialDateBreadcrumb
                isCreatePage={true}
                basePath={basePath}
                brandPropertiesPath={brandPropertiesPath}
            />
            <BulkSpecialDateForm
                brandName={CUSTOMER_BRANDS.INSTAFARMS}
                brandId={brandId}
                basePath={basePath}
            />
        </div>
    );
}
