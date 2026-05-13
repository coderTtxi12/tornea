import { z } from "zod";

import { combineCountryDialAndNationalToE164 } from "@/logic/access-request/whatsapp";
import { findDialOptionByIso2 } from "@/lib/phone/country-dial-options";

/**
 * Validación de campos de texto del formulario "Agregar jugador". Los archivos
 * (foto y CURP) se validan aparte (tamaño / MIME) y son opcionales.
 *
 * Notas:
 * - WhatsApp es opcional; si lo tocás, el número local debe ser válido para el país.
 * - Número de camiseta es opcional, entero entre 0 y 999 (varios deportes admiten 0).
 * - Posición es texto libre, opcional, máx. 60 caracteres.
 */
export const newPlayerFormFieldsSchema = z
  .object({
    teamId: z.string().uuid("Selecciona un equipo válido."),
    leagueId: z.string().uuid("Liga no válida."),
    fullName: z.string().trim().min(2, "Captura el nombre del jugador.").max(160),
    /** Vacío = sin número. Si trae algo, debe ser entero 0–999. */
    shirtNumber: z.string().trim(),
    /** Texto libre opcional (POR, DEF, MC, DEL, etc.). */
    position: z.string().trim().max(60).optional().default(""),
    /** Vacío = sin WhatsApp. */
    whatsappCountryIso: z.string().min(2).max(2),
    whatsappPhoneNational: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const numRaw = data.shirtNumber.replace(/\D/g, "");
    if (data.shirtNumber.trim().length > 0 && numRaw.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "El número debe ser un entero (0–999).",
        path: ["shirtNumber"],
      });
    } else if (numRaw.length > 0) {
      const n = Number(numRaw);
      if (!Number.isInteger(n) || n < 0 || n > 999) {
        ctx.addIssue({
          code: "custom",
          message: "Usa un número entre 0 y 999.",
          path: ["shirtNumber"],
        });
      }
    }

    const phoneDigits = data.whatsappPhoneNational.replace(/\D/g, "");
    if (phoneDigits.length === 0) {
      // WhatsApp opcional: si está vacío, no validamos el país.
      return;
    }
    const country = findDialOptionByIso2(data.whatsappCountryIso);
    if (!country) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona un país válido para el WhatsApp.",
        path: ["whatsappCountryIso"],
      });
      return;
    }
    const iso = data.whatsappCountryIso.toUpperCase();
    if (iso === "MX") {
      if (!/^[0-9]{10}$/.test(phoneDigits)) {
        ctx.addIssue({
          code: "custom",
          message: "Para México usa 10 dígitos.",
          path: ["whatsappPhoneNational"],
        });
      }
      return;
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      ctx.addIssue({
        code: "custom",
        message: "Revisa la longitud del número (8–15 dígitos).",
        path: ["whatsappPhoneNational"],
      });
    }
  });

export type NewPlayerFormFields = z.infer<typeof newPlayerFormFieldsSchema>;

/** Devuelve E.164 si hay número, o `null` si el WhatsApp queda vacío. */
export function buildOptionalPlayerWhatsappE164(
  countryIso: string,
  nationalRaw: string,
): string | null {
  const national = nationalRaw.replace(/\D/g, "");
  if (!national.length) return null;
  const country = findDialOptionByIso2(countryIso);
  if (!country) return null;
  return combineCountryDialAndNationalToE164(country.dialDigits, national);
}

/** `0–999` o `null`. */
export function parseOptionalShirtNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits.length) return null;
  const n = Number(digits);
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  return n;
}
