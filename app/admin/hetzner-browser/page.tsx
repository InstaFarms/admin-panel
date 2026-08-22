import HetznerBrowserClient from "./HetznerBrowserClient";
import { resolveHetznerBaseUrl } from "@/lib/hetzner-s3";

export const dynamic = "force-dynamic";

export default function HetznerBrowserPage() {
  return (
    <HetznerBrowserClient
      devBaseUrl={resolveHetznerBaseUrl("dev")}
      prodBaseUrl={resolveHetznerBaseUrl("prod")}
    />
  );
}
