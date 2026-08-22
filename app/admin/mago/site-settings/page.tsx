import { getSiteSettings } from "@/actions/settingsActions";
import BrandSiteSettingsPage from "@/components/settings/BrandSiteSettingsPage";
import { MAGO_SITE_SETTINGS_BREADCRUMBS } from "@/constants/settings";

export const dynamic = "force-dynamic";

export default async function MagoSiteSettingsPage() {
  const existingSettings = await getSiteSettings("mago");

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
      scope="mago"
      title="Mago Site Settings"
      badgeLabel="Mago"
      breadcrumbs={[...MAGO_SITE_SETTINGS_BREADCRUMBS]}
      initialSettings={settingsValue}
      instafarmWatermarkUrl={existingSettings?.instafarmWatermarkUrl}
    />
  );
}
