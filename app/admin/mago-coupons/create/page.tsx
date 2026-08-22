import { Card } from "flowbite-react";

import CouponEditor from "@/components/coupons/CouponEditor";
import PageBreadcrumb from "@/components/PageBreadcrumb";

import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import { MAGO_COUPON_BREADCRUMBS } from "@/constants/coupons";

import { getAllBrands } from "@/actions/brandActions";

export default async function CreateMagoCouponPage() {
  const brands = await getAllBrands();
  const magoBrand = brands.find(
    (b: any) => b.name?.toLowerCase() === CUSTOMER_BRANDS.MAGO.toLowerCase(),
  );

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Mago Coupons
          </h5>
          <PageBreadcrumb
            items={MAGO_COUPON_BREADCRUMBS.create}
            className="pb-3"
          />
        </div>

        <div className="mx-auto w-full max-w-5xl rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <CouponEditor
            brandName={CUSTOMER_BRANDS.MAGO}
            brandId={String(magoBrand?.id || "")}
            title="Create New Mago Coupon"
          />
        </div>
      </Card>
    </div>
  );
}
