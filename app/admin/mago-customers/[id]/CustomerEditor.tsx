"use client";

import SharedCustomerEditor from "@/components/customers/CustomerEditor";
import type { CustomerBrandName } from "@/constants/customerBrands";
import type { CustomerData } from "@/utils/types";
import DeleteCustomerButton from "../DeleteCustomerButton";

interface CustomerEditorProps {
  data?: CustomerData;
  brandName: CustomerBrandName;
  formId: string;
}

export default function CustomerEditor({ data, brandName, formId }: CustomerEditorProps) {
  return (
    <SharedCustomerEditor
      data={data}
      brandName={brandName}
      formId={formId}
      deleteAction={
        data?.id ? <DeleteCustomerButton id={data.id} brandName={brandName} /> : undefined
      }
    />
  );
}
