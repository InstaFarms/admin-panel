import { JarvisLoader } from "@/components/JarvisLogo";

/**
 * Shown while /admin/layout.tsx resolves (isAdmin() backend check + dashboard
 * data fetches) - Next.js renders this as an instant fallback instead of a
 * blank tab during that wait.
 */
export default function AdminLoading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white dark:bg-zinc-950">
      <JarvisLoader size="lg" />
    </div>
  );
}
