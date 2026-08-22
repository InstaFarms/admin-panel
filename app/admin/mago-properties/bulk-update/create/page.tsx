import BulkSpecialDateForm from "@/components/BulkSpecialDateUpdate/BulkSpecialDateForm";
import BulkSpecialDateBreadcrumb from "@/components/BulkSpecialDateUpdate/BulkSpecialDateBreadcrumb";

import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

import { getAllBrands } from "@/actions/brandActions";

export const dynamic = "force-dynamic";

export default async function MagoBulkUpdateCreatePage() {
    const brands = await getAllBrands(["id", "name"]);
    const magoBrand = brands.find((b: any) => b.name?.toLowerCase() === CUSTOMER_BRANDS.MAGO.toLowerCase());
    const brandId = magoBrand?.id;

    const basePath = "/admin/mago-properties/bulk-update";
    const brandPropertiesPath = "/admin/properties";

    return (
        <div className="flex w-full flex-col gap-4">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Create Mago Bulk Special Date Update
            </h5>
            <BulkSpecialDateBreadcrumb
                isCreatePage={true}
                basePath={basePath}
                brandPropertiesPath={brandPropertiesPath}
            />
            <BulkSpecialDateForm
                brandName={CUSTOMER_BRANDS.MAGO}
                brandId={brandId}
                basePath={basePath}
            />
        </div>
    );
}
