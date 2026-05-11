import telephoneData from "country-telephone-data";

export type CountryDialOption = {
  iso2: string;
  nameEs: string;
  dialDigits: string;
};

export function flagEmojiFromIso2(iso2: string): string {
  const upper = iso2.toUpperCase();
  if (upper.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + upper.charCodeAt(0) - 65,
    A + upper.charCodeAt(1) - 65,
  );
}

const namesEs =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames(["es"], { type: "region" })
    : null;

function toNameEs(iso2: string, fallbackEn: string): string {
  const upper = iso2.toUpperCase();
  try {
    const label = namesEs?.of(upper);
    if (label) return label;
  } catch {
    /* invalid region code */
  }
  return fallbackEn.split("(")[0].trim();
}

function buildOptions(): CountryDialOption[] {
  const out: CountryDialOption[] = [];
  const seenIso = new Set<string>();

  for (const row of telephoneData.allCountries) {
    const dialDigits = String(row.dialCode).replace(/\D/g, "");
    if (!dialDigits) continue;

    const iso2 = row.iso2.toUpperCase();
    if (seenIso.has(iso2)) continue;
    seenIso.add(iso2);

    out.push({
      iso2,
      nameEs: toNameEs(iso2, row.name),
      dialDigits,
    });
  }

  const mexico = out.filter((o) => o.iso2 === "MX");
  const rest = out
    .filter((o) => o.iso2 !== "MX")
    .sort((a, b) =>
      a.nameEs.localeCompare(b.nameEs, "es", { sensitivity: "base" }),
    );

  return [...mexico, ...rest];
}

let cached: CountryDialOption[] | null = null;

export function getCountryDialOptions(): CountryDialOption[] {
  if (!cached) {
    cached = buildOptions();
  }
  return cached;
}

export function findDialOptionByIso2(
  iso2: string,
): CountryDialOption | undefined {
  return getCountryDialOptions().find((o) => o.iso2 === iso2.toUpperCase());
}

export const DEFAULT_WHATSAPP_COUNTRY_ISO2 = "MX";
