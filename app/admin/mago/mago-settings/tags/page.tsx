import BrandContentListPage from "@/components/content-admin/BrandContentListPage";
import { ServerPageProps } from "@/utils/types";

export default function Page({ searchParams }: ServerPageProps) {
  return <BrandContentListPage scope="mago" section="tags" searchParams={searchParams} />;
}
