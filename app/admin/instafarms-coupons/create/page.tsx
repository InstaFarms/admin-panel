import { Card } from "flowbite-react";

import CouponEditor from "@/components/coupons/CouponEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";

import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import { INSTAFARMS_COUPON_BREADCRUMBS } from "@/constants/coupons";

import { getAllBrands } from "@/actions/brandActions";

export default async function CreateInstafarmsCouponPage() {
  const brands = await getAllBrands();
  const instafarmsBrand = brands.find(
    (b: any) =>
      b.name?.toLowerCase() === CUSTOMER_BRANDS.INSTAFARMS.toLowerCase(),
  );

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Instafarms Coupons
          </h5>
          <PageBreadcrumb
            items={INSTAFARMS_COUPON_BREADCRUMBS.create}
            className="pb-3"
          />
        </div>

        <div className="mx-auto w-full max-w-5xl rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <CouponEditor
            brandName={CUSTOMER_BRANDS.INSTAFARMS}
            brandId={String(instafarmsBrand?.id || "")}
            title="Create New Instafarms Coupon"
          />
        </div>
      </Card>
    </div>
  );
}
