"use client";

/**
 * Admin shell navbar: sidebar toggle, brand link, user info (when authenticated), and logout.
 * Shown only when not on the login page (ConditionalNavbar hides this on "/").
 */
import { clearAuthCookie } from "@/actions/loginActions";
import { LOGIN_PATH } from "@/constants/auth";
import { ADMIN_DASHBOARD_PATH } from "@/constants/routes";
import { useSidebar } from "@/contexts/SidebarContext";
import { JarvisWordmark } from "@/components/JarvisLogo";
import { Button, Navbar, DarkThemeToggle } from "flowbite-react";
import Cookies from "js-cookie";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiMenu, HiX, HiLogout } from "react-icons/hi";
import { GalleryDownloadHeaderStatus, GalleryUploadHeaderStatus } from "./properties/gallery-section";

const AUTH_COOKIE_NAME = "jarvis-admin-token";
const ADMIN_DOC_ID_COOKIE = "adminDocumentId";
const ADMIN_USER_INFO_KEY = "admin-user-info";

export default function AdminNavbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string; phone?: string; panelRole?: string } | null>(null);
  const pathname = usePathname();
  const { isOpen, toggleSidebar } = useSidebar();
  const topbarRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const isLoginPage = pathname === LOGIN_PATH;

  useEffect(() => setMounted(true), []);

  // Slide the topbar in on mount only - covers a fresh login and a hard
  // refresh (both fully remount this layout), but not in-app navigation
  // (Navbar stays mounted across route changes, so clicking around won't
  // replay this).
  // Gated on `mounted` so this only fires a render tick after hydration
  // finishes - doing it directly in a mount effect races with React's
  // hydration verification and throws false-positive hydration-mismatch
  // warnings for the styles GSAP writes.
  useEffect(() => {
    if (!mounted || !topbarRef.current) return;
    import("gsap").then(({ gsap }) => {
      if (topbarRef.current) {
        gsap.from(topbarRef.current, { y: -56, opacity: 0, duration: 0.45, ease: "power3.out" });
      }
    });
  }, [mounted]);

  useEffect(() => {
    const checkAuth = () => {
      const token = Cookies.get(AUTH_COOKIE_NAME);
      const hasAuth = !!token;
      setIsAuthenticated(hasAuth);

      if (hasAuth) {
        const stored = localStorage.getItem(ADMIN_USER_INFO_KEY);
        if (stored) {
          try {
            setUserInfo(JSON.parse(stored));
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }
      } else {
        setUserInfo(null);
      }
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleLogout = async () => {
    // Fade the whole app out (same feel as the design's step transitions) while the
    // logout request runs, so leaving lands on the login screen smoothly instead of
    // an abrupt hard cut. The login page then plays its own entrance animation.
    const fadeOut = import("gsap").then(
      ({ gsap }) =>
        new Promise<void>((resolve) => {
          gsap.to(document.body, {
            opacity: 0,
            scale: 0.99,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => resolve(),
          });
        })
    );

    const clearSession = clearAuthCookie().catch((err) => {
      console.error("Logout error:", err);
    });

    await Promise.all([fadeOut, clearSession]);

    Cookies.remove(AUTH_COOKIE_NAME, { path: "/" });
    Cookies.remove(ADMIN_DOC_ID_COOKIE, { path: "/" });
    localStorage.removeItem(ADMIN_USER_INFO_KEY);
    setIsAuthenticated(false);
    setUserInfo(null);
    window.location.href = LOGIN_PATH;
  };

  return (
    <div ref={topbarRef}>
    <Navbar
      fluid
      className={`
        w-full
        h-12 md:h-14
        bg-white dark:bg-zinc-900
        border-b border-zinc-200 dark:border-zinc-800
        shadow-none
        px-4
        relative z-50
        [&>div]:h-full
        [&>div]:flex
        [&>div]:items-center
      `}
    >
      <div className="flex items-center justify-between gap-3 md:gap-4 w-full min-w-0 h-full py-0">
        {/* Toggle Button & Brand */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 h-full">
          {!isLoginPage && (
            <>
              <button
                onClick={toggleSidebar}
                className="
                  p-2
                  rounded-lg
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800
                  transition-all duration-200
                  hover:scale-105
                  active:scale-95
                "
                aria-label="Toggle sidebar"
              >
                {isOpen ? (
                  <HiX size={22} className="transition-transform duration-200" />
                ) : (
                  <HiMenu size={22} className="transition-transform duration-200" />
                )}
              </button>
              
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block self-center" />
            </>
          )}
          
          <Link 
            href={isLoginPage ? "/" : ADMIN_DASHBOARD_PATH} 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg py-1"
          >
            <div className="flex items-center h-full">
              <JarvisWordmark layout="inline" />
            </div>
          </Link>
        </div>

        {/* Download / Upload status (when active) & Theme toggle & User section & Logout */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 h-full">
          <GalleryUploadHeaderStatus />
          <GalleryDownloadHeaderStatus />
          <div className="navbar-theme-toggle flex items-center [&_button]:p-1.5 [&_button]:text-base [&_svg]:w-4 [&_svg]:h-4">
            <DarkThemeToggle />
          </div>
          {isAuthenticated && (
            <>
              <div className="hidden sm:flex flex-col items-end justify-center min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px] leading-tight">
                  {userInfo?.name || "Admin"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] leading-tight">
                  {userInfo?.panelRole?.replaceAll("_", " ") || userInfo?.email || userInfo?.phone || "Administrator"}
                </span>
              </div>
              <div className="sm:hidden flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {(userInfo?.name?.charAt(0) || "A").toUpperCase()}
                  </span>
                </div>
              </div>
            </>
          )}
          <Button
            color="red"
            size="xs"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
            aria-label="Logout"
          >
            <HiLogout className="text-xs flex-shrink-0" />
            <span className="hidden sm:inline text-xs">Logout</span>
          </Button>
        </div>
      </div>
    </Navbar>
    </div>
  );
}
