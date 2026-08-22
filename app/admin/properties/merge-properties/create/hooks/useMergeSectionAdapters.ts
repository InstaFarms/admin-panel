"use client";

import { useMemo } from "react";

/**
 * Merge wizard uses the same adapters shape as split wizard.
 * We keep a dedicated hook file so the merge flow can diverge later if needed.
 */
export function useMergeSectionAdapters(input: {
  propertyTypes: any[];
  detailForm: any;
  addressForm: any;
  dayWiseForm: Record<string, any>;
  areaData: any[];
  cityData: any[];
  stateData: any[];
  othersOverride: { description: string; bookingPolicy: string };
  specialDatesOverride: any[];
  galleryOverride: any[];
  coverPhotosOverride: any[];
  parentPropertyData: any;
  setDetailForm: React.Dispatch<React.SetStateAction<any>>;
  setAddressForm: React.Dispatch<React.SetStateAction<any>>;
  setDayWiseForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setDetailOverride: React.Dispatch<React.SetStateAction<any>>;
  setAddressOverride: React.Dispatch<React.SetStateAction<any>>;
  setOthersOverride: React.Dispatch<React.SetStateAction<{ description: string; bookingPolicy: string }>>;
  setSpecialDatesOverride: React.Dispatch<React.SetStateAction<any[]>>;
  setGalleryOverride: React.Dispatch<React.SetStateAction<any[]>>;
  setCoverPhotosOverride: React.Dispatch<React.SetStateAction<any[]>>;
  joditConfig: any;
}) {
  const {
    propertyTypes,
    detailForm,
    addressForm,
    dayWiseForm,
    areaData,
    cityData,
    stateData,
    othersOverride,
    specialDatesOverride,
    galleryOverride,
    coverPhotosOverride,
    parentPropertyData,
    setDetailForm,
    setAddressForm,
    setDayWiseForm,
    setDetailOverride,
    setAddressOverride,
    setOthersOverride,
    setSpecialDatesOverride,
    setGalleryOverride,
    setCoverPhotosOverride,
    joditConfig,
  } = input;

  return useMemo(
    () => ({
      detail: {
        propertyTypes,
        ...detailForm,
        setPropertyTypeId: (value: string) => setDetailForm((p: any) => ({ ...p, propertyTypeId: value })),
        setIsDisabled: (value: boolean) => setDetailForm((p: any) => ({ ...p, isDisabled: value })),
        setPropertyName: (value: string) => {
          setDetailForm((p: any) => ({ ...p, propertyName: value }));
          setDetailOverride((p: any) => ({ ...p, propertyName: value }));
        },
        setPropertyCodeName: (value: string) => {
          setDetailForm((p: any) => ({ ...p, propertyCodeName: value }));
          setDetailOverride((p: any) => ({ ...p, propertyCodeName: value }));
        },
        setSlug: (value: string) => {
          setDetailForm((p: any) => ({ ...p, slug: value }));
          setDetailOverride((p: any) => ({ ...p, slug: value }));
        },
        setPropertyCode: (value: string) => {
          setDetailForm((p: any) => ({ ...p, propertyCode: value }));
          setDetailOverride((p: any) => ({ ...p, propertyCode: value }));
        },
        setHeading: (value: string) => setDetailForm((p: any) => ({ ...p, heading: value })),
        setWeight: (value: number | null) => setDetailForm((p: any) => ({ ...p, weight: value })),
        setBedroomCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, bedroomCount: value })),
        setBathroomCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, bathroomCount: value })),
        setDoubleBedCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, doubleBedCount: value })),
        setSingleBedCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, singleBedCount: value })),
        setMattressCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, mattressCount: value })),
        setBaseGuestCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, baseGuestCount: value })),
        setMaxGuestCount: (value: number | null) => setDetailForm((p: any) => ({ ...p, maxGuestCount: value })),
        setCommissionPercentage: (value: number | null) => setDetailForm((p: any) => ({ ...p, commissionPercentage: value })),
        setSecurityDeposit: (value: number | null) => setDetailForm((p: any) => ({ ...p, securityDeposit: value })),
        setShowOnInstafarms: (value: boolean) => setDetailForm((p: any) => ({ ...p, showOnInstafarms: value })),
        setAllowOnlineBooking: (value: boolean) => setDetailForm((p: any) => ({ ...p, allowOnlineBooking: value })),
        setAllowCallBooking: (value: boolean) => setDetailForm((p: any) => ({ ...p, allowCallBooking: value })),
        setAllowEnquiry: (value: boolean) => setDetailForm((p: any) => ({ ...p, allowEnquiry: value })),
        setIsPresentOnMago: (value: boolean) => setDetailForm((p: any) => ({ ...p, isPresentOnMago: value })),
        setRequiresConfirmation: (value: boolean) => setDetailForm((p: any) => ({ ...p, requiresConfirmation: value })),
        setAdvancePaymentEnabled: (value: boolean) => setDetailForm((p: any) => ({ ...p, advancePaymentEnabled: value })),
        handleAdvancePercentageChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setDetailForm((p: any) => ({ ...p, advancePaymentPercentage: e.target.value })),
        setCookingAccessFee: (value: number) => setDetailForm((p: any) => ({ ...p, cookingAccessFee: value })),
        setCheckinTime: (value: string | null) => setDetailForm((p: any) => ({ ...p, checkinTime: value })),
        setCheckoutTime: (value: string | null) => setDetailForm((p: any) => ({ ...p, checkoutTime: value })),
      },
      auditManagement: {
        propertyManagementType: (parentPropertyData?.propertyManagementType ?? null) as any,
        setPropertyManagementType: () => {},
        auditEnabled: Boolean(parentPropertyData?.auditEnabled),
        setAuditEnabled: () => {},
        maxAuditGapDays: parentPropertyData?.maxAuditGapDays ?? null,
        setMaxAuditGapDays: () => {},
        auditAreas: Array.isArray(parentPropertyData?.auditAreas) ? parentPropertyData.auditAreas : [],
        unsavedAuditItems: [],
        isLoading: false,
        onAddArea: async () => false,
        onRemoveArea: async () => false,
        getAreaItems: async () => ({ success: true, data: { inventory: [], maintenance: [], supplies: [] } }),
        onAddItem: async () => false,
        onUpdateItem: async () => false,
        onRemoveItem: async () => false,
      },
      address: {
        areaData,
        cityData,
        stateData,
        ...addressForm,
        setStateId: (value: string) => setAddressForm((p: any) => ({ ...p, stateId: value })),
        setCityId: (value: string) => setAddressForm((p: any) => ({ ...p, cityId: value })),
        setAreaId: (value: string) => setAddressForm((p: any) => ({ ...p, areaId: value })),
        setSecondaryAreaId1: (value: string) => setAddressForm((p: any) => ({ ...p, secondaryAreaId1: value })),
        setSecondaryAreaId2: (value: string) => setAddressForm((p: any) => ({ ...p, secondaryAreaId2: value })),
        setSecondaryAreaId3: (value: string) => setAddressForm((p: any) => ({ ...p, secondaryAreaId3: value })),
        setSecondaryAreaId4: (value: string) => setAddressForm((p: any) => ({ ...p, secondaryAreaId4: value })),
        setAddress: (value: string) => {
          setAddressForm((p: any) => ({ ...p, address: value }));
          setAddressOverride((p: any) => ({ ...p, address: value }));
        },
        setPincode: (value: string) => {
          setAddressForm((p: any) => ({ ...p, pincode: value }));
          setAddressOverride((p: any) => ({ ...p, pincode: value }));
        },
        setLandmark: (value: string) => {
          setAddressForm((p: any) => ({ ...p, landmark: value }));
          setAddressOverride((p: any) => ({ ...p, landmark: value }));
        },
        setLatitude: (value: string) => setAddressForm((p: any) => ({ ...p, latitude: value })),
        setLongitude: (value: string) => setAddressForm((p: any) => ({ ...p, longitude: value })),
        setMapLink: (value: string) => setAddressForm((p: any) => ({ ...p, mapLink: value })),
      },
      dayWise: {
        ...dayWiseForm,
        enableFloatingGuests: Boolean(dayWiseForm.enableFloatingGuests),
        setEnableFloatingGuests: (value: boolean) => setDayWiseForm((p: any) => ({ ...p, enableFloatingGuests: value })),
        maxGuestCount: detailForm.maxGuestCount,
        setMondayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, mondayPrice: value })),
        setTuesdayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, tuesdayPrice: value })),
        setWednesdayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, wednesdayPrice: value })),
        setThursdayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, thursdayPrice: value })),
        setFridayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, fridayPrice: value })),
        setSaturdayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, saturdayPrice: value })),
        setSundayPrice: (value: number | null) => setDayWiseForm((p: any) => ({ ...p, sundayPrice: value })),
      },
      googlePlace: {
        googlePlaceId: parentPropertyData?.googlePlaceId || "",
        setGooglePlaceId: () => {},
        latitude: addressForm.latitude,
        longitude: addressForm.longitude,
        googlePlaceRating: parentPropertyData?.googlePlaceRating ? String(parentPropertyData.googlePlaceRating) : "",
        setGooglePlaceRating: () => {},
        googlePlaceUserRatingCount: Number(parentPropertyData?.googlePlaceUserRatingCount ?? 0),
        setGooglePlaceUserRatingCount: () => {},
        googlePlaceReviews: Array.isArray(parentPropertyData?.googlePlaceReviews) ? parentPropertyData.googlePlaceReviews : [],
        setGooglePlaceReviews: () => {},
        nearbyPlaces: Array.isArray(parentPropertyData?.nearbyPlaces) ? parentPropertyData.nearbyPlaces : [],
        setNearbyPlaces: () => {},
        editingReviewIndex: null,
        setEditingReviewIndex: () => {},
        editingNearbyIndex: null,
        setEditingNearbyIndex: () => {},
      },
      specialDates: {
        specialDateData: specialDatesOverride,
        updateSpecialDate: (data: any) => {
          const duplicate = specialDatesOverride.some((item: any) => item.id !== data.id && item.date === data.date);
          if (duplicate) return false;
          setSpecialDatesOverride((prev: any[]) => prev.map((item: any) => (item.id === data.id ? data : item)));
          return true;
        },
        addSpecialDate: () =>
          setSpecialDatesOverride((prev: any[]) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              date: "",
              price: null,
              priceWithGST: null,
              adultExtraGuestCharge: null,
              adultExtraGuestChargeWithGST: null,
              childExtraGuestCharge: null,
              childExtraGuestChargeWithGST: null,
              infantExtraGuestCharge: null,
              infantExtraGuestChargeWithGST: null,
              baseGuestCount: null,
              discount: null,
              maxExtraGuestPrice: null,
              maxTotal: null,
              gstSlab: null,
            },
          ]),
        removeSpecialDate: (id: string) =>
          setSpecialDatesOverride((prev: any[]) => prev.filter((item: any) => item.id !== id)),
        createNewSpecialDate: () => ({
          id: crypto.randomUUID(),
          date: "",
          price: null,
          priceWithGST: null,
          adultExtraGuestCharge: null,
          adultExtraGuestChargeWithGST: null,
          childExtraGuestCharge: null,
          childExtraGuestChargeWithGST: null,
          infantExtraGuestCharge: null,
          infantExtraGuestChargeWithGST: null,
          baseGuestCount: null,
          discount: null,
          maxExtraGuestPrice: null,
          maxTotal: null,
          gstSlab: null,
        }),
        setSpecialDateData: (data: any[]) => setSpecialDatesOverride(data),
        maxGuestCount: detailForm.maxGuestCount,
      },
      amenitiesActivities: {
        allAmenities: [],
        allActivities: [],
        amenities: Array.isArray(parentPropertyData?.amenities) ? parentPropertyData.amenities : [],
        activities: Array.isArray(parentPropertyData?.activities) ? parentPropertyData.activities : [],
        addAmenityWithSelection: () => {},
        removeAmenity: () => {},
        addActivityWithSelection: () => {},
        removeActivity: () => {},
        handleAmenityDragEnd: () => {},
        handleActivityDragEnd: () => {},
      },
      gallery: {
        gallery: galleryOverride,
        coverPhotos: coverPhotosOverride,
        onGalleryChange: (nextGallery: any[]) => setGalleryOverride(Array.isArray(nextGallery) ? nextGallery : []),
        onCoverPhotosChange: (nextCoverPhotos: any[]) =>
          setCoverPhotosOverride(Array.isArray(nextCoverPhotos) ? nextCoverPhotos : []),
      },
      safetyHygiene: {
        safetyHygiene: Array.isArray(parentPropertyData?.safetyHygiene) ? parentPropertyData.safetyHygiene : [],
        allSafetyHygiene: [],
        addSafetyHygiene: () => {},
        removeSafetyHygiene: () => {},
        updateSafetyHygiene: () => {},
      },
      spaces: {
        spaces: Array.isArray(parentPropertyData?.spaces) ? parentPropertyData.spaces : [],
        updateSpace: () => {},
      },
      owners: { users: Array.isArray(parentPropertyData?.owners) ? parentPropertyData.owners : [], searchQuery: "", setSearchQuery: () => {}, searchResults: [], searchUsers: () => {}, addUser: () => {}, removeUser: () => {} },
      managers: { users: Array.isArray(parentPropertyData?.managers) ? parentPropertyData.managers : [], searchQuery: "", setSearchQuery: () => {}, searchResults: [], searchUsers: () => {}, addUser: () => {}, removeUser: () => {} },
      caretakers: { users: Array.isArray(parentPropertyData?.caretakers) ? parentPropertyData.caretakers : [], searchQuery: "", setSearchQuery: () => {}, searchResults: [], searchUsers: () => {}, addUser: () => {}, removeUser: () => {} },
      plans: {
        discountPlans: Array.isArray(parentPropertyData?.discountPlans) ? parentPropertyData.discountPlans : [],
        shortTermCancellationPlan: parentPropertyData?.shortTermCancellationPlan ?? null,
        longTermCancellationPlan: parentPropertyData?.longTermCancellationPlan ?? null,
        discountSearchQuery: "",
        setDiscountSearchQuery: () => {},
        shortTermSearchQuery: "",
        setShortTermSearchQuery: () => {},
        longTermSearchQuery: "",
        setLongTermSearchQuery: () => {},
        discountSearchResults: [],
        shortTermSearchResults: [],
        longTermSearchResults: [],
        searchDiscountPlans: () => {},
        searchShortTermPlans: () => {},
        searchLongTermPlans: () => {},
        addDiscountPlan: () => {},
        removeDiscountPlan: () => {},
        addShortTermPlan: () => {},
        removeShortTermPlan: () => {},
        addLongTermPlan: () => {},
        removeLongTermPlan: () => {},
      },
      ical: {
        icalLinks: Array.isArray(parentPropertyData?.icalLinks) ? parentPropertyData.icalLinks : [],
        showAddForm: false,
        setShowAddForm: () => {},
        newLink: { name: "", icalUrl: "" },
        setNewLink: () => {},
        exportUrl: parentPropertyData?.exportUrl || "",
        icalLoading: false,
        handleAddIcalLink: async () => false,
        handleSyncIcalLink: async () => false,
        handleDeleteIcalLink: async () => false,
        handleCopyExportUrl: () => {},
      },
      others: {
        descriptionText: othersOverride.description,
        setDescriptionText: (value: string) => setOthersOverride((p) => ({ ...p, description: value })),
        homeRulesText:
          parentPropertyData?.homeRulesTruths?.content ||
          parentPropertyData?.homeRulesAndTruth?.content ||
          "",
        setHomeRulesText: () => {},
        bookingPolicy: othersOverride.bookingPolicy,
        setBookingPolicy: (value: string) => setOthersOverride((p) => ({ ...p, bookingPolicy: value })),
        faqs: Array.isArray(parentPropertyData?.faqs) ? parentPropertyData.faqs : [],
        selectedFaqCategory: "",
        setSelectedFaqCategory: () => {},
        draggedFaqIndex: null,
        dragOverFaqIndex: null,
        addFaq: () => {},
        removeFaq: () => {},
        updateFaq: () => {},
        handleFaqDragStart: () => {},
        handleFaqDragOver: () => {},
        handleFaqDragLeave: () => {},
        handleFaqDrop: () => {},
        handleFaqDragEnd: () => {},
        handleFaqCsvUpload: () => {},
        handleFaqCsvExport: () => {},
        metaTitle: parentPropertyData?.meta?.metaTitle || "",
        setMetaTitle: () => {},
        metaUrl: parentPropertyData?.meta?.metaUrl || "",
        setMetaUrl: () => {},
        metaDescription: parentPropertyData?.meta?.metaDescription || "",
        setMetaDescription: () => {},
        metaKeyword: parentPropertyData?.meta?.metaKeyword || "",
        setMetaKeyword: () => {},
        joditConfig,
      },
    }),
    [
      propertyTypes,
      detailForm,
      addressForm,
      dayWiseForm,
      areaData,
      cityData,
      stateData,
      othersOverride,
      specialDatesOverride,
      galleryOverride,
      coverPhotosOverride,
      parentPropertyData,
      joditConfig,
      setDetailForm,
      setAddressForm,
      setDayWiseForm,
      setDetailOverride,
      setAddressOverride,
      setOthersOverride,
      setSpecialDatesOverride,
      setGalleryOverride,
      setCoverPhotosOverride,
    ]
  );
}

