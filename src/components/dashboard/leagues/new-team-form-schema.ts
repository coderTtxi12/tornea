import { z } from "zod";

import { combineCountryDialAndNationalToE164 } from "@/logic/access-request/whatsapp";
import { findDialOptionByIso2 } from "@/lib/phone/country-dial-options";

function refineNationalPhone(
  data: {
    countryIso: string;
    national: string;
  },
  ctx: z.RefinementCtx,
  paths: { country: string; national: string },
) {
  const national = data.national.replace(/\D/g, "");
  const country = findDialOptionByIso2(data.countryIso);

  if (!country) {
    ctx.addIssue({ code: "custom", message: "País no válido", path: [paths.country] });
    return;
  }

  if (!national.length) {
    ctx.addIssue({
      code: "custom",
      message: "Ingresa el número local (sin la lada del país).",
      path: [paths.national],
    });
    return;
  }

  const iso = data.countryIso.toUpperCase();
  if (iso === "MX") {
    if (!/^[0-9]{10}$/.test(national)) {
      ctx.addIssue({
        code: "custom",
        message: "Para México usa 10 dígitos.",
        path: [paths.national],
      });
    }
    return;
  }

  if (national.length < 8 || national.length > 15) {
    ctx.addIssue({
      code: "custom",
      message: "Revisa la longitud del número local (8–15 dígitos).",
      path: [paths.national],
    });
    return;
  }

  const e164 = combineCountryDialAndNationalToE164(country.dialDigits, national);
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 10) {
    ctx.addIssue({
      code: "custom",
      message: "El número completo parece incompleto.",
      path: [paths.national],
    });
  }
}

function refineOptionalEmail(raw: string, ctx: z.RefinementCtx, fieldPath: string) {
  const t = raw.trim();
  if (!t) return;
  const r = z.string().email().safeParse(t);
  if (!r.success) {
    ctx.addIssue({ code: "custom", message: "Correo no válido", path: [fieldPath] });
  }
}

export const newTeamFormFieldsSchema = z
  .object({
    teamName: z.string().trim().min(2, "Indica al menos 2 caracteres").max(120),
    leagueCategoryId: z.string().uuid("Elegí una categoría válida"),
    directorName: z.string().trim().min(2, "Indica el nombre del dirigente").max(120),
    directorEmail: z.string().trim().max(254),
    directorCountryIso: z.string().min(2).max(2),
    directorPhoneNational: z.string().trim(),
    additionalName: z.string().trim().min(2, "Indica el nombre del contacto adicional").max(120),
    additionalEmail: z.string().trim().max(254),
    additionalCountryIso: z.string().min(2).max(2),
    additionalPhoneNational: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    refineOptionalEmail(data.directorEmail, ctx, "directorEmail");
    refineOptionalEmail(data.additionalEmail, ctx, "additionalEmail");

    refineNationalPhone(
      { countryIso: data.directorCountryIso, national: data.directorPhoneNational },
      ctx,
      { country: "directorCountryIso", national: "directorPhoneNational" },
    );
    refineNationalPhone(
      { countryIso: data.additionalCountryIso, national: data.additionalPhoneNational },
      ctx,
      { country: "additionalCountryIso", national: "additionalPhoneNational" },
    );
  });

export type NewTeamFormFields = z.infer<typeof newTeamFormFieldsSchema>;

export const teamStatusEnumSchema = z.enum(["active", "inactive", "withdrawn"]);

export function buildWhatsappE164(countryIso: string, nationalRaw: string): string {
  const national = nationalRaw.replace(/\D/g, "");
  const country = findDialOptionByIso2(countryIso);
  if (!country) {
    throw new Error("País de teléfono no válido");
  }
  return combineCountryDialAndNationalToE164(country.dialDigits, national);
}
