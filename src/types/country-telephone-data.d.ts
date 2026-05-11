declare module "country-telephone-data" {
  const telephoneData: {
    allCountries: Array<{
      name: string;
      iso2: string;
      dialCode: string;
      format?: string;
      hasAreaCodes?: boolean;
      priority?: number;
    }>;
    iso2Lookup: Record<string, number>;
  };
  export default telephoneData;
}
