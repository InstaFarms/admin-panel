import { Card } from "flowbite-react";
import PermanentPriceUpdateForm from "@/components/BulkPermanentUpdate/PermanentPriceUpdateForm";
import PermanentPriceUpdateLogs from "@/components/BulkPermanentUpdate/PermanentPriceUpdateLogs";
import BulkSpecialDateBreadcrumb from "@/components/BulkSpecialDateUpdate/BulkSpecialDateBreadcrumb";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import { getAllBrands } from "@/actions/brandActions";

export const dynamic = "force-dynamic";

export default async function InstafarmsPermanentPriceUpdatePage() {
    const brands = await getAllBrands(["id", "name"]);
    const instafarmsBrand = brands.find((b: any) => b.name?.toLowerCase() === CUSTOMER_BRANDS.INSTAFARMS.toLowerCase());
    const brandId = instafarmsBrand?.id;

    const basePath = "/admin/instafarms-properties/permanent-price-update";
    const brandPropertiesPath = "/admin/properties";

    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col gap-4">
                <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Instafarms Permanent Price Update
                </h5>
                <BulkSpecialDateBreadcrumb
                    basePath={basePath}
                    brandPropertiesPath={brandPropertiesPath}
                />
            </div>

            <Card className="w-full bg-white dark:bg-gray-800">
                <PermanentPriceUpdateLogs
                    brandId={brandId}
                    brandName={CUSTOMER_BRANDS.INSTAFARMS}
                    createPath={basePath + "/create"}
                />
            </Card>
        </div>
    );
}
