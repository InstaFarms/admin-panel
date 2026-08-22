export interface BrandDetail {
    brandId: string;
    stateId: string;
    slug?: string | null;
    heading?: string | null;
    description?: string | null;
    isActive: boolean;
    weight: string;
    featured: boolean;
    icon?: string | null;
    faqs?: any[] | null;
    info?: any | null;
    meta?: any | null;
}

export interface StateEditorProps {
    brands?: { id: string; name: string }[];
    data?: {
        id: string;
        state: string;
        activeBrandId?: string;
        configuredBrandIds?: string[];
        weight: number;
        featured: boolean;
        isActive?: boolean;
        icon?: string;
        slug?: string;
        brandDetails?: BrandDetail[];
        faqs?: Array<{
            question: string;
            answer: string;
            isActive: boolean;
            weight: number;
        }>;
        heading?: string;
        description?: string;
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
        };
        meta?: {
            metaTitle?: string;
            metaDescription?: string;
            metaUrl?: string;
            metaImage?: string;
        };
    };
}
