const MX_DEFAULT_CC = "52";

/** Builds E.164 from ITU country calling code (digits only) + national number. */
export function combineCountryDialAndNationalToE164(
  countryDialDigits: string,
  nationalRaw: string,
): string {
  const cc = countryDialDigits.replace(/\D/g, "");
  const national = nationalRaw.replace(/\D/g, "");
  if (!cc || !national) {
    return "";
  }
  return `+${cc}${national}`;
}

/**
 * Normalizes user-entered WhatsApp / mobile input for storage (E.164-style with leading +).
 * If the value has no country code, assumes Mexico (+52).
 */
export function normalizeWhatsappForStorage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (hasPlus && digitsOnly.length > 0) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+${MX_DEFAULT_CC}${digitsOnly}`;
  }

  if (
    digitsOnly.length === 12 &&
    digitsOnly.startsWith(MX_DEFAULT_CC)
  ) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }

  return `+${MX_DEFAULT_CC}${digitsOnly}`;
}
