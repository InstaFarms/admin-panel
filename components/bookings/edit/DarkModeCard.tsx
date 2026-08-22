"use client";

import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";
import { useEffect, useState } from "react";

interface DarkModeCardProps {
  children: React.ReactNode;
}

export default function DarkModeCard({ children }: DarkModeCardProps) {
  const [isDark, setIsDark] = useState(true); // Default to dark since mode="dark" is set

  useEffect(() => {
    // Check if dark class is on HTML element
    const checkDark = () => {
      const html = document.documentElement;
      const hasDark = html.classList.contains('dark');
      setIsDark(hasDark);
    };

    // Check immediately and after a delay
    checkDark();
    const timeout = setTimeout(checkDark, 100);
    
    // Watch for changes
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  // Use inline styles to force dark mode colors
  const cardBg = isDark ? '#1f2937' : '#ffffff';
  const innerBg = isDark ? '#111827' : '#f1f5f9';
  const textColor = isDark ? '#f9fafb' : '#111827';

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full" style={{ backgroundColor: cardBg }}>
        <div className="flex flex-col gap-2 rounded-t-lg p-4" style={{ backgroundColor: cardBg }}>
          <h5 className="text-xl font-bold tracking-tight" style={{ color: textColor }}>
            Bookings
          </h5>

          <Breadcrumb className="bg-transparent pb-3">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/bookings">Bookings</BreadcrumbItem>
            <BreadcrumbItem href="#">Edit</BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div className="w-full mx-auto rounded-xl p-4 sm:p-6 lg:p-8 m-4" style={{ backgroundColor: innerBg }}>
          <div className="flex flex-row items-center justify-between mb-6">
            <h6 className="text-lg font-bold tracking-tight" style={{ color: textColor }}>
              Edit Booking
            </h6>
          </div>
          {children}
        </div>
      </Card>
    </div>
  );
}

