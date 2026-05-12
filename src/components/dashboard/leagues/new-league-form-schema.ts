import { z } from "zod";

import { combineCountryDialAndNationalToE164 } from "@/logic/access-request/whatsapp";
import { findDialOptionByIso2 } from "@/lib/phone/country-dial-options";

/**
 * Validación de campos de texto; el archivo de escudo se valida aparte (tamaño / MIME).
 */
export const newLeagueTextFieldsSchema = z
  .object({
    leagueName: z.string().trim().min(2, "Indica al menos 2 caracteres").max(120),
    contactName: z.string().trim().min(2, "Indica el nombre del contacto").max(120),
    contactCountryIso: z.string().min(2).max(2),
    /** Número nacional (solo dígitos en submit; puede incluir espacios al tipar). */
    contactPhoneNational: z.string().trim(),
    contactEmail: z.string().trim().email("Correo no válido"),
    organizationAddress: z
      .string()
      .trim()
      .min(10, "La dirección es demasiado corta")
      .max(500),
  })
  .superRefine((data, ctx) => {
    const national = data.contactPhoneNational.replace(/\D/g, "");
    const country = findDialOptionByIso2(data.contactCountryIso);

    if (!country) {
      ctx.addIssue({
        code: "custom",
        message: "País no válido",
        path: ["contactCountryIso"],
      });
      return;
    }

    if (!national.length) {
      ctx.addIssue({
        code: "custom",
        message: "Ingresá el número local (sin la lada del país).",
        path: ["contactPhoneNational"],
      });
      return;
    }

    const iso = data.contactCountryIso.toUpperCase();
    if (iso === "MX") {
      if (!/^[0-9]{10}$/.test(national)) {
        ctx.addIssue({
          code: "custom",
          message: "Para México usá 10 dígitos.",
          path: ["contactPhoneNational"],
        });
      }
      return;
    }

    if (national.length < 8 || national.length > 15) {
      ctx.addIssue({
        code: "custom",
        message: "Revisá la longitud del número local (8–15 dígitos).",
        path: ["contactPhoneNational"],
      });
      return;
    }

    const e164 = combineCountryDialAndNationalToE164(country.dialDigits, national);
    const digits = e164.replace(/\D/g, "");
    if (digits.length < 10) {
      ctx.addIssue({
        code: "custom",
        message: "El número completo parece incompleto.",
        path: ["contactPhoneNational"],
      });
    }
  });

export type NewLeagueTextFields = z.infer<typeof newLeagueTextFieldsSchema>;
