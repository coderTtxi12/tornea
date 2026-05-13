import {
  DEFAULT_WHATSAPP_COUNTRY_ISO2,
  getCountryDialOptions,
} from "@/lib/phone/country-dial-options";

/**
 * Intenta separar E.164 en código de país (ISO2) y número nacional usando las ladas conocidas
 * (orden por longitud descendente para evitar ambigüedad 1 vs 12 vs 52).
 */
export function splitE164ToCountryAndNational(e164Raw: string): {
  iso2: string;
  nationalDigits: string;
} {
  const digits = e164Raw.replace(/\D/g, "");
  if (!digits) {
    return { iso2: DEFAULT_WHATSAPP_COUNTRY_ISO2, nationalDigits: "" };
  }
  const options = [...getCountryDialOptions()].sort(
    (a, b) => b.dialDigits.length - a.dialDigits.length,
  );
  for (const o of options) {
    if (
      digits.startsWith(o.dialDigits) &&
      digits.length > o.dialDigits.length
    ) {
      return {
        iso2: o.iso2,
        nationalDigits: digits.slice(o.dialDigits.length),
      };
    }
  }
  return { iso2: DEFAULT_WHATSAPP_COUNTRY_ISO2, nationalDigits: digits };
}
