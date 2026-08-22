import BulkSpecialDateBreadcrumb from "@/components/BulkSpecialDateUpdate/BulkSpecialDateBreadcrumb";
import BulkLogDashboard from "@/components/BulkSpecialDateUpdate/BulkLogDashboard";

import { CUSTOMER_BRANDS } from "@/constants/customerBrands";

import { getAllBrands } from "@/actions/brandActions";
import { fetchBulkLogs } from "@/actions/bulkActions";

export const dynamic = "force-dynamic";

export default async function InstafarmsBulkUpdatePage() {
    const brands = await getAllBrands(["id", "name"]);
    const instafarmsBrand = brands.find((b: any) => b.name?.toLowerCase() === CUSTOMER_BRANDS.INSTAFARMS.toLowerCase());
    const brandId = instafarmsBrand?.id;

    const logsResult = await fetchBulkLogs(brandId);
    const logs = logsResult.data || [];

    const basePath = "/admin/instafarms-properties/bulk-update";
    const brandPropertiesPath = "/admin/properties"; // Generic or we could use a filtered one if it existed

    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col gap-4">
                <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Instafarms Bulk Special Date Update
                </h5>
                <BulkSpecialDateBreadcrumb
                    basePath={basePath}
                    brandPropertiesPath={brandPropertiesPath}
                />
            </div>

            <BulkLogDashboard
                logs={logs}
                createPath={basePath + "/create"}
            />
        </div>
    );
}
