import { getAgreementModelById } from "@/actions/agreementModelActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import AgreementModelForm from "@/components/agreement-models/AgreementModelForm";
import {
  AGREEMENT_MODEL_BREADCRUMBS,
  AGREEMENT_MODEL_ERRORS,
} from "@/constants/agreementModels";
import { ServerPageProps } from "@/utils/types";
import { Card } from "flowbite-react";

export default async function EditAgreementModelPage({
  params,
}: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");
  const data = await getAgreementModelById(idString);

  if (!data) {
    throw new Error(AGREEMENT_MODEL_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Agreement Tab
          </h5>
          <PageBreadcrumb items={AGREEMENT_MODEL_BREADCRUMBS.edit} />
        </div>

        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 transition-all duration-200 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Agreement Model
          </h6>
          <AgreementModelForm data={data} />
        </div>
      </Card>
    </div>
  );
}
