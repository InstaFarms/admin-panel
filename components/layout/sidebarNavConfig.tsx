/**
 * Sidebar navigation config: single source of truth for admin nav items and groups.
 * Used by Sidebar.tsx to render the tree without repeating JSX.
 */
import type { ReactNode } from "react";
import type { AdminPermissionKey } from "@repo/db/types";
import {
  HiArchive,
  HiBell,
  HiCalendar,
  HiChartBar,
  HiClipboardList,
  HiCurrencyDollar,
  HiDatabase,
  HiDocumentText,
  HiDownload,
  HiExclamationCircle,
  HiGift,
  HiGlobe,
  HiHome,
  HiInbox,
  HiLocationMarker,
  HiMail,
  HiNewspaper,
  HiOfficeBuilding,
  HiOutlineClock,
  HiPhone,
  HiPhotograph,
  HiPlusCircle,
  HiQuestionMarkCircle,
  HiShieldCheck,
  HiSparkles,
  HiSwitchHorizontal,
  HiTag,
  HiTerminal,
  HiTemplate,
  HiTicket,
  HiUser,
  HiUserCircle,
  HiViewGrid,
  HiXCircle,
} from "react-icons/hi";
import {
  HiBuildingOffice2,
  HiClipboardDocumentList,
  HiCog6Tooth,
  HiOutlineCloudArrowUp,
  HiUserGroup,
  HiWrenchScrewdriver,
} from "react-icons/hi2";
import type { IconType } from "react-icons";
import { AiFillDashboard } from "react-icons/ai";
import { RiAdminFill } from "react-icons/ri";
import { FaMapLocationDot } from "react-icons/fa6";
import { FaQuora } from "react-icons/fa";
import { MdViewCarousel } from "react-icons/md";

export type SidebarIcon = IconType;

/** Exact path match or path prefix for active state. */
export type ActiveMatch = "exact" | string;

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: SidebarIcon;
  permissionKey?: AdminPermissionKey;
  /** "exact" = pathname === href; string = pathname.startsWith(value). */
  activeMatch?: ActiveMatch;
}

export interface SidebarNavGroup {
  label: string;
  icon: SidebarIcon;
  items: SidebarNavGroupChild[];
  permissionKey?: AdminPermissionKey;
  /** When set, used as collapse label; receives approvalCount and elivaasCount. */
  customLabel?: (approvalCount?: number, elivaasCount?: number) => ReactNode;
}

export type SidebarNavGroupChild = SidebarNavItem | SidebarNavGroup;

/** Optional custom label for a nav item (e.g. Approval Queue with badge). */
export interface SidebarNavItemWithCustomLabel extends SidebarNavItem {
  customLabel?: (approvalCount?: number, elivaasCount?: number) => ReactNode;
}

export type SidebarNavEntry =
  | { type: "item"; item: SidebarNavItem }
  | { type: "group"; group: SidebarNavGroup };

const item = (entry: SidebarNavItem): SidebarNavEntry => ({
  type: "item",
  item: entry,
});
const group = (entry: SidebarNavGroup): SidebarNavEntry => ({
  type: "group",
  group: entry,
});

export const SIDEBAR_NAV: SidebarNavEntry[] = [
  item({
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: AiFillDashboard,
    permissionKey: "DASHBOARD",
    activeMatch: "exact",
  }),
  item({
    href: "/admin/dashboard/milestone-priority",
    label: "Milestone Priority",
    icon: HiChartBar,
    permissionKey: "DASHBOARD",
    activeMatch: "/admin/dashboard/milestone-priority",
  }),
  group({
    label: "All Users",
    icon: HiUserGroup,
    permissionKey: "ALL_USERS",
    items: [
      {
        href: "/admin/admins",
        label: "Admins",
        icon: RiAdminFill,
        permissionKey: "ADMINS",
        activeMatch: "/admin/admins",
      },
      {
        href: "/admin/role-permissions",
        label: "Role Permissions",
        icon: HiCog6Tooth,
        permissionKey: "ADMINS",
        activeMatch: "/admin/role-permissions",
      },
      {
        href: "/admin/supervisors",
        label: "Supervisors",
        icon: HiUserGroup,
        permissionKey: "SUPERVISORS",
        activeMatch: "/admin/supervisors",
      },
      {
        label: "Customers",
        icon: HiUserCircle,
        permissionKey: "CUSTOMERS",
        items: [
          {
            href: "/admin/Instafarms-customer",
            label: "Instafarms Customers",
            icon: HiUserCircle,
            permissionKey: "CUSTOMERS",
            activeMatch: "/admin/Instafarms-customer",
          },
          {
            href: "/admin/mago-customers",
            label: "Mago Customers",
            icon: HiUserCircle,
            permissionKey: "CUSTOMERS",
            activeMatch: "/admin/mago-customers",
          },
        ],
      },
      {
        label: "Owner gang",
        icon: HiUser,
        permissionKey: "OWNER_GANG",
        items: [
          {
            href: "/admin/users",
            label: "All Property Users",
            icon: HiUser,
            permissionKey: "ALL_PROPERTY_USERS",
            activeMatch: "exact",
          },
          {
            href: "/admin/users/owners",
            label: "Owners",
            icon: HiUser,
            permissionKey: "OWNERS",
            activeMatch: "/admin/users/owners",
          },
          {
            href: "/admin/users/managers",
            label: "Managers",
            icon: HiUser,
            permissionKey: "MANAGERS",
            activeMatch: "/admin/users/managers",
          },
          {
            href: "/admin/users/caretakers",
            label: "Caretakers",
            icon: HiUser,
            permissionKey: "CARETAKERS",
            activeMatch: "/admin/users/caretakers",
          },
        ],
      },
    ],
  }),
  group({
    label: "Locations",
    icon: FaMapLocationDot,
    permissionKey: "LOCATIONS",
    items: [
      {
        href: "/admin/locations/states",
        label: "States",
        icon: HiGlobe,
        activeMatch: "/admin/locations/states",
      },
      {
        href: "/admin/locations/cities",
        label: "Cities",
        icon: HiOfficeBuilding,
        activeMatch: "/admin/locations/cities",
      },
      {
        href: "/admin/locations/areas",
        label: "Areas",
        icon: FaMapLocationDot,
        activeMatch: "/admin/locations/areas",
      },
      {
        href: "/admin/regions",
        label: "Regions",
        icon: HiGlobe,
        activeMatch: "/admin/regions",
      },
      {
        href: "/admin/localities",
        label: "Localities",
        icon: HiOfficeBuilding,
        activeMatch: "/admin/localities",
      },
      {
        href: "/admin/destinations",
        label: "Destinations",
        icon: HiLocationMarker,
        activeMatch: "/admin/destinations",
      },
      {
        href: "/admin/locations/landmarks",
        label: "Landmarks",
        icon: HiLocationMarker,
        activeMatch: "/admin/locations/landmarks",
      },
    ],
  }),
  group({
    label: "Property Data",
    icon: HiBuildingOffice2,
    permissionKey: "PROPERTY_DATA",
    items: [
      {
        href: "/admin/field-ops",
        label: "Field Ops",
        icon: HiClipboardDocumentList,
        permissionKey: "PROPERTY_DATA",
        activeMatch: "/admin/field-ops",
      },
      {
        href: "/admin/ops-config",
        label: "Ops Configuration",
        icon: HiWrenchScrewdriver,
        permissionKey: "PROPERTY_DATA",
        activeMatch: "/admin/ops-config",
      },
      {
        href: "/admin/propertyTypes",
        label: "Property Types",
        icon: HiOfficeBuilding,
        activeMatch: "/admin/propertyTypes",
      },
      {
        label: "Properties",
        icon: HiBuildingOffice2,
        items: [
          {
            href: "/admin/properties/view",
            label: "View All",
            icon: HiBuildingOffice2,
            activeMatch: "/admin/properties/view",
          },
          {
            href: "/admin/properties",
            label: "Properties List",
            icon: HiBuildingOffice2,
            activeMatch: "exact",
          },
          {
            href: "/admin/properties/split-properties",
            label: "Split Properties",
            icon: HiViewGrid,
            activeMatch: "/admin/properties/split-properties",
          },
          {
            href: "/admin/properties/merge-properties",
            label: "Merge Properties",
            icon: HiViewGrid,
            activeMatch: "/admin/properties/merge-properties",
          },
        ],
      },
      {
        label: "Mago Tabs",
        icon: HiClipboardDocumentList,
        items: [
          {
            href: "/admin/blocking-reasons",
            label: "Blocking Reasons",
            icon: HiClipboardList,
            activeMatch: "/admin/blocking-reasons",
          },
          {
            href: "/admin/source-commissions",
            label: "Sources",
            icon: HiCurrencyDollar,
            activeMatch: "/admin/source-commissions",
          },
          {
            href: "/admin/agreement-models",
            label: "Agreement",
            icon: HiDocumentText,
            activeMatch: "/admin/agreement-models",
          },
        ],
      },
      {
        label: "Property Info Options",
        icon: HiClipboardDocumentList,
        items: [
          {
            href: "/admin/activities",
            label: "Activities",
            icon: HiPlusCircle,
            activeMatch: "/admin/activities",
          },
          {
            href: "/admin/amenities",
            label: "Amenities",
            icon: HiSparkles,
            activeMatch: "/admin/amenities",
          },
          {
            href: "/admin/safety-hygiene",
            label: "Safety and Hygiene",
            icon: HiShieldCheck,
            activeMatch: "/admin/safety-hygiene",
          },
        ],
      },
      {
        label: "Plans",
        icon: HiCurrencyDollar,
        items: [
          {
            label: "Discount Plans",
            icon: HiGift,
            items: [
              {
                href: "/admin/mago/discount-plans",
                label: "Mago",
                icon: HiGift,
                activeMatch: "/admin/mago/discount-plans",
              },
              {
                href: "/admin/instafarm/discount-plans",
                label: "Instafarms",
                icon: HiGift,
                activeMatch: "/admin/instafarm/discount-plans",
              },
            ],
          },
          {
            label: "Cancellation Plans",
            icon: HiXCircle,
            items: [
              {
                href: "/admin/mago/cancellation-plans",
                label: "Mago",
                icon: HiXCircle,
                activeMatch: "/admin/mago/cancellation-plans",
              },
              {
                href: "/admin/instafarm/cancellation-plans",
                label: "Instafarms",
                icon: HiXCircle,
                activeMatch: "/admin/instafarm/cancellation-plans",
              },
            ],
          },
        ],
      },
    ],
  }),
  group({
    label: "Proposals",
    icon: HiClipboardDocumentList,
    permissionKey: "PROPOSALS",
    items: [
      {
        href: "/admin/instafarms-proposals",
        label: "Instafarms Proposals",
        icon: HiClipboardDocumentList,
        activeMatch: "/admin/instafarms-proposals",
      },
      {
        href: "/admin/mago-proposals",
        label: "Mago Proposals",
        icon: HiClipboardDocumentList,
        activeMatch: "/admin/mago-proposals",
      },
    ],
  }),
  group({
    label: "Booking Management",
    icon: HiCalendar,
    permissionKey: "BOOKING_MANAGEMENT",
    customLabel: (count) => (
      <div className="flex w-full items-center justify-between">
        <span>Booking Management</span>
        {count && count > 0 ? (
          <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
            {count}
          </span>
        ) : null}
      </div>
    ),
    items: [
      // {
      //   href: "/admin/bookings/approval-queue",
      //   label: "Approval Queue",
      //   icon: HiClipboardList,
      //   activeMatch: "exact",
      // },

      {
        href: "/admin/bookings/booking-requests",
        label: "Booking Requests",
        icon: HiClipboardList,
        activeMatch: "exact",
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        icon: HiClipboardList,
        activeMatch: "exact",
      },
      {
        href: "/admin/bookings/blocking",
        label: "Blocking",
        icon: HiClipboardList,
        activeMatch: "exact",
      },
      {
        href: "/admin/bookings/cancellations",
        label: "Cancellations",
        icon: HiXCircle,
        activeMatch: "/admin/bookings/cancellations",
      },
      {
        href: "/admin/bookings/archive",
        label: "Archive",
        icon: HiArchive,
        activeMatch: "/admin/bookings/archive",
      },
      {
        label: "iCal",
        icon: HiCalendar,
        items: [
          {
            href: "/admin/bookings/third-party",
            label: "Third Party Bookings",
            icon: HiCalendar,
            activeMatch: "exact",
          },
          {
            href: "/admin/bookings/third-party/sources",
            label: "Booking Sources",
            icon: HiDatabase,
            activeMatch: "/admin/bookings/third-party/sources",
          },
          {
            href: "/admin/bookings/ical-conflicts",
            label: "iCal Booking Conflicts",
            icon: HiExclamationCircle,
            activeMatch: "/admin/bookings/ical-conflicts",
          },
          {
            href: "/admin/bookings/third-party-fill",
            label: "Third-Party Fill",
            icon: HiClipboardList,
            activeMatch: "/admin/bookings/third-party-fill",
          },
          {
            href: "/admin/dashboard/ical-sync-controls",
            label: "iCal Sync Controls",
            icon: HiCalendar,
            activeMatch: "/admin/dashboard/ical-sync-controls",
          },
        ],
      },
      {
        href: "/admin/bookings/download",
        label: "Download",
        icon: HiDownload,
        activeMatch: "exact",
      },
    ],
  }),
  group({
    label: "Wallet & Settlements",
    icon: HiCurrencyDollar,
    permissionKey: "WALLET_AND_SETTLEMENTS",
    items: [
      {
        href: "/admin/wallet",
        label: "Wallet Overview",
        icon: HiCurrencyDollar,
        activeMatch: "exact",
      },
      {
        href: "/admin/wallet/ledger",
        label: "Wallet Ledger",
        icon: HiClipboardList,
        activeMatch: "/admin/wallet/ledger",
      },
      {
        href: "/admin/wallet/payouts",
        label: "Owner Payouts",
        icon: HiInbox,
        activeMatch: "/admin/wallet/payouts",
      },
      {
        href: "/admin/wallet/settlements",
        label: "Settlement Management",
        icon: HiCurrencyDollar,
        activeMatch: "/admin/wallet/settlements",
      },
      {
        href: "/admin/wallet/blocked-settlements",
        label: "Blocked Settlements",
        icon: HiXCircle,
        activeMatch: "/admin/wallet/blocked-settlements",
      },
      {
        href: "/admin/wallet/failed-settlements",
        label: "Failed Settlements",
        icon: HiExclamationCircle,
        activeMatch: "/admin/wallet/failed-settlements",
      },
    ],
  }),
  group({
    label: "Finance",
    icon: HiDatabase,
    permissionKey: "REPORTS",
    items: [
      {
        href: "/admin/finance/booking-finance",
        label: "Booking Finance",
        icon: HiClipboardList,
        permissionKey: "BOOKING_MANAGEMENT",
        activeMatch: "/admin/finance/booking-finance",
      },
      {
        href: "/admin/finance/payments",
        label: "Payments",
        icon: HiCurrencyDollar,
        permissionKey: "BOOKING_MANAGEMENT",
        activeMatch: "/admin/finance/payments",
      },
      {
        href: "/admin/finance/refunds",
        label: "Refunds",
        icon: HiXCircle,
        permissionKey: "BOOKING_MANAGEMENT",
        activeMatch: "/admin/finance/refunds",
      },
      {
        href: "/admin/finance/owner-wallets",
        label: "Owner Wallets",
        icon: HiUser,
        permissionKey: "WALLET_AND_SETTLEMENTS",
        activeMatch: "/admin/finance/owner-wallets",
      },
      {
        href: "/admin/finance/owner-settlements",
        label: "Owner Settlements",
        icon: HiCurrencyDollar,
        permissionKey: "WALLET_AND_SETTLEMENTS",
        activeMatch: "/admin/finance/owner-settlements",
      },
      {
        href: "/admin/finance/payouts",
        label: "Payouts",
        icon: HiOutlineClock,
        permissionKey: "WALLET_AND_SETTLEMENTS",
        activeMatch: "/admin/finance/payouts",
      },
      {
        href: "/admin/finance/platform-ledger",
        label: "Platform Ledger",
        icon: HiDatabase,
        permissionKey: "REPORTS",
        activeMatch: "/admin/finance/platform-ledger",
      },
      {
        href: "/admin/finance/tax-records",
        label: "Tax Records",
        icon: HiDocumentText,
        permissionKey: "REPORTS",
        activeMatch: "/admin/finance/tax-records",
      },
      {
        href: "/admin/settings/tax-configuration",
        label: "Accommodation GST Configuration",
        icon: HiCurrencyDollar,
        permissionKey: "REPORTS",
        activeMatch: "/admin/settings/tax-configuration",
      },
    ],
  }),
  group({
    label: "Reports",
    icon: HiChartBar,
    permissionKey: "REPORTS",
    items: [
      {
        href: "/admin/reports/mago",
        label: "Mago Reports",
        icon: HiChartBar,
        activeMatch: "/admin/reports/mago",
      },
      {
        href: "/admin/reports/instafarms",
        label: "Instafarms Reports",
        icon: HiChartBar,
        activeMatch: "/admin/reports/instafarms",
      },
    ],
  }),
  item({
    href: "/admin/webhooks",
    label: "Webhooks",
    icon: HiTerminal,
    permissionKey: "INSTAFARMS_SPECIFIC_DATA",
    activeMatch: "/admin/webhooks",
  }),
  item({
    href: "/admin/occasions",
    label: "Occasions",
    icon: HiSparkles,
    activeMatch: "/admin/occasions",
  }),
  group({
    label: "Bucket Browsers",
    icon: HiOutlineCloudArrowUp,
    items: [
      {
        href: "/admin/hetzner-browser",
        label: "Bucket Browser",
        icon: HiOutlineCloudArrowUp,
        activeMatch: "/admin/hetzner-browser",
      },
      {
        href: "/admin/r2-browser",
        label: "Bucket Browser (R2)",
        icon: HiOutlineCloudArrowUp,
        activeMatch: "/admin/r2-browser",
      },
    ],
  }),
  group({
    label: "Offer Setup",
    icon: HiTicket,
    permissionKey: "COUPONS",
    items: [
      {
        label: "Coupons",
        icon: HiTag,
        items: [
          {
            href: "/admin/instafarms-coupons",
            label: "Instafarms Coupons",
            icon: HiTag,
            activeMatch: "/admin/instafarms-coupons",
          },
          {
            href: "/admin/mago-coupons",
            label: "Mago Coupons",
            icon: HiTag,
            activeMatch: "/admin/mago-coupons",
          },
        ],
      },
      {
        label: "Last Minute Discount",
        icon: HiGift,
        items: [
          {
            href: "/admin/instafarm/last-minute-discount-plans",
            label: "Instafarms",
            icon: HiGift,
            activeMatch: "/admin/instafarm/last-minute-discount-plans",
          },
          {
            href: "/admin/mago/last-minute-discount-plans",
            label: "Mago",
            icon: HiGift,
            activeMatch: "/admin/mago/last-minute-discount-plans",
          },
        ],
      },
    ],
  }),
  group({
    label: "Bulk Special Date Update",
    icon: HiViewGrid,
    permissionKey: "PROPERTY_DATA",
    items: [
      {
        href: "/admin/instafarms-properties/bulk-update",
        label: "Instafarms Bulk Special Date Update",
        icon: HiBuildingOffice2,
        activeMatch: "exact",
      },
      {
        href: "/admin/mago-properties/bulk-update",
        label: "Mago Bulk Special Date Update",
        icon: HiBuildingOffice2,
        activeMatch: "exact",
      },
    ],
  }),
  group({
    label: "Permanent Price Update",
    icon: HiCurrencyDollar,
    permissionKey: "PROPERTY_DATA",
    items: [
      {
        href: "/admin/instafarms-properties/permanent-price-update",
        label: "Instafarms Permanent Price Update",
        icon: HiBuildingOffice2,
        activeMatch: "exact",
      },
      {
        href: "/admin/mago-properties/permanent-price-update",
        label: "Mago Permanent Price Update",
        icon: HiBuildingOffice2,
        activeMatch: "exact",
      },
    ],
  }),
  group({
    label: "Audit Data",
    icon: HiClipboardDocumentList,
    permissionKey: "AUDIT_DATA",
    items: [
      {
        label: "Audit Master",
        icon: HiClipboardList,
        items: [
          {
            href: "/admin/audit-master/checklist-categories",
            label: "Checklist Category",
            icon: HiClipboardList,
            activeMatch: "/admin/audit-master/checklist-categories",
          },
          {
            href: "/admin/audit-master/checklist-items",
            label: "Checklist Item",
            icon: HiClipboardList,
            activeMatch: "/admin/audit-master/checklist-items",
          },
          {
            href: "/admin/audit-master/area-categories", // Points to area-categories (propertyAuditAreaCategoryMaster table)
            label: "Audit Area Types",
            icon: HiViewGrid,
            activeMatch: "/admin/audit-master/area-categories",
          },
          {
            href: "/admin/audit-master/issue-types",
            label: "Issue Types",
            icon: HiExclamationCircle,
            activeMatch: "/admin/audit-master/issue-types",
          },
          {
            href: "/admin/audit-master/templates",
            label: "Recurring Audit Templates",
            icon: HiClipboardDocumentList,
            activeMatch: "/admin/audit-master/templates",
          },
          {
            href: "/admin/audit-master/data-hub",
            label: "Data Hub",
            icon: HiSwitchHorizontal,
            activeMatch: "/admin/audit-master/data-hub",
          },
        ],
      },
      {
        href: "/admin/supervisor-audits",
        label: "Supervisor Audits",
        icon: HiClipboardDocumentList,
        activeMatch: "/admin/supervisor-audits",
      },
      {
        href: "/admin/activity-logs",
        label: "Staff Activity",
        icon: HiOutlineClock,
        activeMatch: "/admin/activity-logs",
      },
      {
        label: "Property Onboarding",
        icon: HiBuildingOffice2,
        items: [
          {
            href: "/admin/property-onboarding",
            label: "Configuration Overview",
            icon: HiClipboardDocumentList,
            activeMatch: "exact",
          },
          {
            href: "/admin/property-onboarding/building-levels",
            label: "Building Levels",
            icon: HiViewGrid,
            activeMatch: "/admin/property-onboarding/building-levels",
          },
          {
            href: "/admin/property-onboarding/location-contexts",
            label: "Location Contexts",
            icon: HiViewGrid,
            activeMatch: "/admin/property-onboarding/location-contexts",
          },
          {
            href: "/admin/property-onboarding/area-types",
            label: "Onboarding Area Types",
            icon: HiViewGrid,
            activeMatch: "/admin/property-onboarding/area-types",
          },
          {
            href: "/admin/property-onboarding/templates",
            label: "Onboarding Templates",
            icon: HiClipboardList,
            activeMatch: "/admin/property-onboarding/templates",
          },
        ],
      },
    ],
  }),
  item({
    href: "/admin/news-feed",
    label: "News Feed",
    icon: HiNewspaper,
    activeMatch: "/admin/news-feed",
  }),
  item({
    href: "/admin/tickets",
    label: "Tickets",
    icon: HiTicket,
    activeMatch: "/admin/tickets",
  }),
];

export const SIDEBAR_NAV_GROUP_2: SidebarNavEntry[] = [
  group({
    label: "Contact Requests",
    icon: HiMail,
    permissionKey: "CONTACT_REQUESTS",
    items: [
      {
        href: "/admin/requests/enquiries",
        label: "Enquiries",
        icon: HiQuestionMarkCircle,
        activeMatch: "/admin/requests/enquiries",
      },
      {
        href: "/admin/requests/events",
        label: "Events",
        icon: HiCalendar,
        activeMatch: "/admin/requests/events",
      },
      {
        href: "/admin/requests/property",
        label: "Property",
        icon: HiHome,
        activeMatch: "/admin/requests/property",
      },
      {
        href: "/admin/requests/contact-requests",
        label: "Contact Requests",
        icon: HiPhone,
        activeMatch: "/admin/requests/contact-requests",
      },
    ],
  }),
  group({
    label: "Notifications",
    icon: HiBell,
    permissionKey: "NOTIFICATIONS",
    items: [
      {
        href: "/admin/notifications/templates",
        label: "Templates",
        icon: HiTemplate,
        activeMatch: "/admin/notifications/templates",
      },
      {
        href: "/admin/notifications/delivery-log",
        label: "Delivery Log",
        icon: HiInbox,
        activeMatch: "/admin/notifications/delivery-log",
      },
      {
        href: "/admin/notifications/dead-letter-queue",
        label: "Dead Letter Queue",
        icon: HiExclamationCircle,
        activeMatch: "/admin/notifications/dead-letter-queue",
      },
      {
        href: "/admin/notifications/event-log",
        label: "Event Log",
        icon: HiDocumentText,
        activeMatch: "/admin/notifications/event-log",
      },
    ],
  }),
];

export const SIDEBAR_NAV_GROUP_3: SidebarNavEntry[] = [
  group({
    label: "Instafarms Specific Data",
    icon: HiPhotograph,
    items: [
      {
        href: "/admin/static-images",
        label: "Static Images",
        icon: HiPhotograph,
        permissionKey: "INSTAFARMS_SPECIFIC_DATA",
        activeMatch: "/admin/static-images",
      },
      {
        href: "/admin/settings",
        label: "Instafarms Site Settings",
        icon: HiCog6Tooth,
        permissionKey: "INSTAFARMS_SPECIFIC_DATA",
        activeMatch: "exact",
      },
      {
        href: "/admin/instafarm/collection",
        label: "Collections",
        icon: HiViewGrid,
        permissionKey: "COLLECTIONS",
        activeMatch: "/admin/instafarm/collection",
      },
      {
        label: "Content",
        icon: HiGlobe,
        permissionKey: "INSTAFARMS_SPECIFIC_DATA",
        items: [
          {
            href: "/admin/instafarm/instafarms-settings/cms",
            label: "CMS",
            icon: HiDocumentText,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/instafarm/instafarms-settings/cms",
          },
          {
            href: "/admin/instafarm/instafarms-settings/carousel/web",
            label: "Web Carousel",
            icon: MdViewCarousel,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/instafarm/instafarms-settings/carousel/web",
          },
          {
            href: "/admin/instafarm/instafarms-settings/carousel/app",
            label: "App Carousel",
            icon: MdViewCarousel,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/instafarm/instafarms-settings/carousel/app",
          },
          {
            href: "/admin/instafarm/instafarms-settings/tags",
            label: "Tags",
            icon: HiTag,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/instafarm/instafarms-settings/tags",
          },
          {
            href: "/admin/instafarm-content/faqs/locations",
            label: "Location FAQs",
            icon: FaQuora,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/instafarm-content/faqs/locations",
          },
          {
            href: "/admin/instafarm-content/faqs/collections",
            label: "Collections FAQs",
            icon: FaQuora,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/instafarm-content/faqs/collections",
          },
        ],
      },
    ],
  }),
  group({
    label: "Mago Specific Data",
    icon: HiSparkles,
    items: [
      {
        href: "/admin/mago/static-images",
        label: "Static Images",
        icon: HiPhotograph,
        permissionKey: "INSTAFARMS_SPECIFIC_DATA",
        activeMatch: "/admin/mago/static-images",
      },
      {
        href: "/admin/mago/collection",
        label: "Collections",
        icon: HiViewGrid,
        permissionKey: "COLLECTIONS",
        activeMatch: "/admin/mago/collection",
      },
      {
        href: "/admin/mago/site-settings",
        label: "Mago Site Settings",
        icon: HiCog6Tooth,
        permissionKey: "INSTAFARMS_SPECIFIC_DATA",
        activeMatch: "/admin/mago/site-settings",
      },
      {
        label: "Content",
        icon: HiGlobe,
        permissionKey: "INSTAFARMS_SPECIFIC_DATA",
        items: [
          {
            href: "/admin/mago/mago-settings/cms",
            label: "CMS",
            icon: HiDocumentText,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/mago/mago-settings/cms",
          },
          {
            href: "/admin/mago/mago-settings/carousel/web",
            label: "Web Carousel",
            icon: MdViewCarousel,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/mago/mago-settings/carousel/web",
          },
          {
            href: "/admin/mago/mago-settings/carousel/app",
            label: "App Carousel",
            icon: MdViewCarousel,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/mago/mago-settings/carousel/app",
          },
          {
            href: "/admin/mago/mago-settings/tags",
            label: "Tags",
            icon: HiTag,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/mago/mago-settings/tags",
          },
          {
            href: "/admin/mago-content/faqs/mago-locations",
            label: "Location FAQs",
            icon: FaQuora,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/mago-content/faqs/mago-locations",
          },
          {
            href: "/admin/mago-content/faqs/mago-collections",
            label: "Collections FAQs",
            icon: FaQuora,
            permissionKey: "INSTAFARMS_SPECIFIC_DATA",
            activeMatch: "/admin/mago-content/faqs/mago-collections",
          },
        ],
      },
    ],
  }),
  group({
    label: "Elivaas",
    icon: HiOfficeBuilding,
    permissionKey: "BOOKING_MANAGEMENT",
    customLabel: (_approvalCount, elivaasCount) => (
      <div className="flex w-full items-center justify-between">
        <span>Elivaas</span>
        {elivaasCount && elivaasCount > 0 ? (
          <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-medium text-white">
            {elivaasCount}
          </span>
        ) : null}
      </div>
    ),
    items: [
      {
        href: "/admin/elivaas",
        label: "Properties",
        icon: HiViewGrid,
        activeMatch: "exact",
      },
      {
        href: "/admin/elivaas/bookings",
        label: "Bookings",
        icon: HiViewGrid,
        activeMatch: "/admin/elivaas/bookings",
      },
    ],
  }),
  item({
    href: "/admin/history",
    label: "History",
    icon: HiOutlineClock,
    permissionKey: "HISTORY",
  }),
];

/** All sidebar sections in order; first section uses approvalCount for labels. */
export const SIDEBAR_NAV_SECTIONS: {
  entries: SidebarNavEntry[];
  approvalCount?: number;
}[] = [
  { entries: SIDEBAR_NAV },
  { entries: SIDEBAR_NAV_GROUP_2 },
  { entries: SIDEBAR_NAV_GROUP_3 },
];
