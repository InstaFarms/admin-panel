import BrandContentListPage from "@/components/content-admin/BrandContentListPage";
import { ServerPageProps } from "@/utils/types";

export default function Page({ searchParams }: ServerPageProps) {
  return <BrandContentListPage scope="instafarms" section="webCarousel" searchParams={searchParams} />;
}
