"use client";

import CommercialSection from "@/components/properties/CommercialSection";
import MinBookingRulesSection from "@/components/properties/min-booking-rules/MinBookingRulesSection";
import AgreementMilestoneSection from "@/components/properties/agreement-milestone/AgreementMilestoneSection";
import PropertyExpenseTabsSection from "@/components/properties/expenses/PropertyExpenseTabsSection";
import PropertyInvoiceSection from "@/components/properties/invoices/PropertyInvoiceSection";
import NotionalRevenueConfigSection from "@/components/properties/notional-revenue/NotionalRevenueConfigSection";
import PropertySourceCommissionsSection from "@/components/properties/source-commissions/PropertySourceCommissionsSection";
import { type BrandSlug } from "@/lib/properties/propertyEditorDraft";
import type { SpecialDateData } from "@/utils/types";
import { DateTime } from "luxon";
import { useCallback, useState } from "react";
import { v4 } from "uuid";
import type { SectionChange } from "./types";

interface CommercialTabContainerProps {
  sectionData: Record<string, unknown>;
  detailSectionData: Record<string, unknown>;
  commercialBrandSlug: BrandSlug;
  propertyId?: string | null;
  onSectionChange: SectionChange;
  gstPolicy?: { boundary: number; lower: number; higher: number };
}

export default function CommercialTabContainer({
  sectionData,
  detailSectionData,
  commercialBrandSlug,
  propertyId,
  onSectionChange,
  gstPolicy,
}: CommercialTabContainerProps) {
  const [agreementModelFlags, setAgreementModelFlags] = useState({
    isRentBasisModel: false,
    isExpensesBasisModel: false,
    isFixedLeaseModel: false,
  });
  const handleAgreementModelFlagsChange = useCallback(
    (flags: {
      isRentBasisModel: boolean;
      isExpensesBasisModel: boolean;
      isFixedLeaseModel: boolean;
    }) => {
      setAgreementModelFlags((prev) =>
        prev.isRentBasisModel === flags.isRentBasisModel &&
        prev.isExpensesBasisModel === flags.isExpensesBasisModel &&
        prev.isFixedLeaseModel === flags.isFixedLeaseModel
          ? prev
          : flags,
      );
    },
    [],
  );

  const commercialBrandLabel =
    commercialBrandSlug === "mago"
      ? "Mago"
      : commercialBrandSlug === "listing"
        ? "Listings"
        : "Instafarms";

  const updateArrayAtPath = <T,>(path: string, updater: (prev: T[]) => T[]) => {
    onSectionChange(path, (prev: T[] | undefined) =>
      updater(Array.isArray(prev) ? prev : []),
    );
  };

  const createNewSpecialDate = (): SpecialDateData => ({
    id: v4(),
    date: DateTime.now().toFormat("yyyy-LL-dd"),
    price: null,
    priceWithGST: null,
    adultExtraGuestCharge: null,
    adultExtraGuestChargeWithGST: null,
    childExtraGuestCharge: null,
    childExtraGuestChargeWithGST: null,
    infantExtraGuestCharge: null,
    infantExtraGuestChargeWithGST: null,
    floatingAdultExtraGuestCharge: null,
    floatingAdultExtraGuestChargeWithGST: null,
    floatingChildExtraGuestCharge: null,
    floatingChildExtraGuestChargeWithGST: null,
    floatingInfantExtraGuestCharge: null,
    floatingInfantExtraGuestChargeWithGST: null,
    baseGuestCount: null,
    discount: null,
    maxExtraGuestPrice: null,
    maxTotal: null,
    gstSlab: null,
  });

  const updateSpecialDate = (data: SpecialDateData) => {
    onSectionChange(
      `${commercialBrandSlug}.commercial.specialDates`,
      (prev: SpecialDateData[] | undefined) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((sd) => (sd.id === data.id ? { ...sd, ...data } : sd));
      },
    );
    return true;
  };

  return (
    <CommercialSection
      commercialBrandLabel={commercialBrandLabel}
      gstPolicy={gstPolicy}
      commercial={sectionData}
      setCommercialField={(field, value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.${field}`, value)
      }
      specialDateData={
        (Array.isArray(sectionData.specialDates)
          ? sectionData.specialDates
          : []) as SpecialDateData[]
      }
      updateSpecialDate={updateSpecialDate}
      addSpecialDate={() =>
        updateArrayAtPath<SpecialDateData>(
          `${commercialBrandSlug}.commercial.specialDates`,
          (prev) => [...prev, createNewSpecialDate()],
        )
      }
      removeSpecialDate={(id) =>
        updateArrayAtPath<SpecialDateData>(
          `${commercialBrandSlug}.commercial.specialDates`,
          (prev) => prev.filter((sd) => sd.id !== id),
        )
      }
      createNewSpecialDate={createNewSpecialDate}
      setSpecialDateData={(next) =>
        onSectionChange(`${commercialBrandSlug}.commercial.specialDates`, next)
      }
      maxGuestCount={
        typeof detailSectionData.maxGuestCount === "number"
          ? detailSectionData.maxGuestCount
          : null
      }
      commissionPercentage={
        typeof sectionData.commissionPercentage === "number"
          ? sectionData.commissionPercentage
          : null
      }
      setCommissionPercentage={(value) =>
        onSectionChange(
          `${commercialBrandSlug}.commercial.commissionPercentage`,
          value,
        )
      }
      isFixedLeaseModel={
        commercialBrandSlug === "mago" && agreementModelFlags.isFixedLeaseModel
      }
      cookingAccessFee={
        typeof sectionData.cookingAccessFee === "number"
          ? sectionData.cookingAccessFee
          : 0
      }
      setCookingAccessFee={(value) =>
        onSectionChange(
          `${commercialBrandSlug}.commercial.cookingAccessFee`,
          value,
        )
      }
      bonFireFee={
        typeof sectionData.bonFireFee === "number" ? sectionData.bonFireFee : 0
      }
      setBonFireFee={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.bonFireFee`, value)
      }
      barbequeFee={
        typeof sectionData.barbequeFee === "number"
          ? sectionData.barbequeFee
          : 0
      }
      setBarbequeFee={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.barbequeFee`, value)
      }
      cleaningFee={
        typeof sectionData.cleaningFee === "number"
          ? sectionData.cleaningFee
          : 0
      }
      setCleaningFee={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.cleaningFee`, value)
      }
      lateCheckoutCharges={
        typeof sectionData.lateCheckoutCharges === "number"
          ? sectionData.lateCheckoutCharges
          : 0
      }
      setLateCheckoutCharges={(value) =>
        onSectionChange(
          `${commercialBrandSlug}.commercial.lateCheckoutCharges`,
          value,
        )
      }
      minBookingNights={
        typeof sectionData.minBookingNights === "number"
          ? sectionData.minBookingNights
          : 1
      }
      setMinBookingNights={(value) =>
        onSectionChange(
          `${commercialBrandSlug}.commercial.minBookingNights`,
          value,
        )
      }
      minBookingRulesPanel={
        propertyId ? <MinBookingRulesSection propertyId={propertyId} /> : null
      }
      securityDeposit={
        typeof sectionData.securityDeposit === "number"
          ? sectionData.securityDeposit
          : null
      }
      setSecurityDeposit={(value) =>
        onSectionChange(
          `${commercialBrandSlug}.commercial.securityDeposit`,
          value,
        )
      }
      advancePaymentEnabled={Boolean(sectionData.advancePaymentEnabled)}
      setAdvancePaymentEnabled={(value) =>
        onSectionChange(
          `${commercialBrandSlug}.commercial.advancePaymentEnabled`,
          value,
        )
      }
      advancePaymentPercentage={
        (sectionData.advancePaymentPercentage as string) || ""
      }
      handleAdvancePercentageChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onSectionChange(
            `${commercialBrandSlug}.commercial.advancePaymentPercentage`,
            raw,
          );
          return;
        }
        const num = Number(raw);
        if (Number.isNaN(num) || num < 0 || num > 100) return;
        onSectionChange(
          `${commercialBrandSlug}.commercial.advancePaymentPercentage`,
          raw,
        );
      }}
      notionalRevenueConfigPanel={
        commercialBrandSlug === "mago" && propertyId ? (
          <NotionalRevenueConfigSection propertyId={propertyId} />
        ) : null
      }
      sourceCommissionsPanel={
        commercialBrandSlug === "mago" && propertyId ? (
          <PropertySourceCommissionsSection propertyId={propertyId} />
        ) : null
      }
      agreementMilestonePanel={
        commercialBrandSlug === "mago" && propertyId ? (
          <AgreementMilestoneSection
            propertyId={propertyId}
            onAgreementModelFlagsChange={handleAgreementModelFlagsChange}
          />
        ) : null
      }
      expensesPanel={
        commercialBrandSlug === "mago" &&
        propertyId &&
        agreementModelFlags.isExpensesBasisModel ? (
          <PropertyExpenseTabsSection propertyId={propertyId} />
        ) : null
      }
      invoicePanel={
        commercialBrandSlug === "mago" && propertyId ? (
          <PropertyInvoiceSection propertyId={propertyId} />
        ) : null
      }
    />
  );
}
