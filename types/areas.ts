export interface AreaBrandDetail {
    brandId: string;
    brand_id?: string;
    areaId: string;
    slug?: string | null;
    heading?: string | null;
    description?: string | null;
    isActive?: boolean;
    is_active?: boolean;
    weight?: string | number | null;
    featured?: boolean;
    icon?: string | null;
    faqs?: Array<{
        question: string;
        answer: string;
        isActive: boolean;
        weight: number;
    }>;
    info?: {
        title?: string;
        description?: string;
        howToReach?: {
            title?: string;
            description?: string;
            nearByPlaces?: string[];
        };
        mapSearchKey?: string;
        nearByAttractions?: string[];
    } | null;
    meta?: {
        metaTitle?: string;
        meta_title?: string;
        metaDescription?: string;
        meta_description?: string;
        metaUrl?: string;
        meta_url?: string;
        metaImage?: string;
        meta_image?: string;
        metaImageUrl?: string;
        metaKeywords?: string;
    } | null;
}

export interface AreaEditorProps {
    data?: {
        id: string;
        area: string;
        cityId: string;
        stateId: string;
        activeBrandId?: string;
        configuredBrandIds?: string[];
        slug?: string;
        weight?: string;
        featured?: boolean;
        isActive?: boolean;
        icon?: string;
        areaInfo?: any;
        faqs?: any[];
        meta?: any;
        city?: { id: string; city: string };
        state?: { id: string; state: string };
        brandDetails?: AreaBrandDetail[];
    };
    cityData: Array<{ id: string; city: string; stateId: string }>;
    stateData: Array<{ id: string; state: string }>;
    brands?: Array<{ id: string; name: string }>;
    nearbyAreasInitials?: {
        nearbyArea1?: { stateId?: string; cityId?: string; areaId?: string } | null;
        nearbyArea2?: { stateId?: string; cityId?: string; areaId?: string } | null;
        nearbyArea3?: { stateId?: string; cityId?: string; areaId?: string } | null;
        nearbyArea4?: { stateId?: string; cityId?: string; areaId?: string } | null;
    };
    allStates?: Array<{ id: string; state: string }>;
}
