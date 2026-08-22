import R2BrowserClient from "./R2BrowserClient";
import { resolveR2BaseUrl } from "@/lib/r2-s3";

export const dynamic = "force-dynamic";

export default function R2BrowserPage() {
  return (
    <R2BrowserClient
      devBaseUrl={resolveR2BaseUrl("dev")}
      prodBaseUrl={resolveR2BaseUrl("prod")}
    />
  );
}
