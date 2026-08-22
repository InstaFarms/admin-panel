"use client";

/**
 * Renders the admin Navbar only when not on the login page.
 * Used in the root layout so the shell (navbar + sidebar) is hidden on login.
 */
import { usePathname } from "next/navigation";
import AdminNavbar from "@/components/Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";  // Login page is the root path

  if (isLoginPage) return null;

  return <AdminNavbar />;
}
