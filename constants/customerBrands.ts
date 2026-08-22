export const CUSTOMER_BRANDS = {
  INSTAFARMS: "Instafarms",
  MAGO: "Mago",
} as const;

export type CustomerBrandName = (typeof CUSTOMER_BRANDS)[keyof typeof CUSTOMER_BRANDS];
