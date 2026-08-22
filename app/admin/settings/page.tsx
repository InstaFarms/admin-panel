import { getSiteSettings, getBookingExpiry } from "@/actions/settingsActions";
import BrandSiteSettingsPage from "@/components/settings/BrandSiteSettingsPage";
import { SETTINGS_BREADCRUMBS } from "@/constants/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const existingSettings = await getSiteSettings();

  const settingsValue = existingSettings
    ? {
        homePageNumber: existingSettings.homePageNumber,
        supportNumber: existingSettings.supportNumber,
        supportEmail: existingSettings.supportEmail,
        whatsappNumber: existingSettings.whatsappNumber,
        centralBookingNumber: existingSettings.centralBookingNumber,
        siteTitle: existingSettings.siteTitle,
        siteMetaTitle: existingSettings.siteMetaTitle,
        siteMetaKeywords: existingSettings.siteMetaKeywords,
        siteMetaDescription: existingSettings.siteMetaDescription,
      }
    : {};

  return (
    <BrandSiteSettingsPage
      scope="instafarms"
      title="Instafarms Site Settings"
      badgeLabel="Instafarms"
      breadcrumbs={[...SETTINGS_BREADCRUMBS]}
      initialSettings={settingsValue}
      instafarmWatermarkUrl={existingSettings?.instafarmWatermarkUrl}
      bookingExpiryHours={await getBookingExpiry()}
    />
  );
}
