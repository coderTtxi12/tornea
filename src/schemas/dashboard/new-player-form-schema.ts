import { z } from "zod";

import { combineCountryDialAndNationalToE164 } from "@/logic/access-request/whatsapp";
import {
  invalidCurpMessage,
  isValidMexicanCurp,
  normalizeCurpInput,
} from "@/logic/players/curp";
import { findDialOptionByIso2 } from "@/lib/phone/country-dial-options";
import { validateBirthDateIso } from "@/logic/players/birth-date-validation";

/**
 * Validación de campos de texto del formulario "Agregar jugador". La CURP (texto)
 * usa `logic/players/curp`; el escaneo (foto de CURP) y la foto del jugador se validan aparte.
 *
 * Notas:
 * - WhatsApp es opcional; si lo tocás, el número local debe ser válido para el país.
 * - Número de camiseta es opcional, entero entre 0 y 999 (varios deportes admiten 0).
 * - Posición es texto libre, opcional, máx. 60 caracteres.
 * - Fecha de nacimiento obligatoria (`YYYY-MM-DD`), anterior a hoy, año ≥ 1900.
 */
function addBirthDateFieldIssues(val: string, ctx: z.RefinementCtx) {
  const message = validateBirthDateIso(val);
  if (message) {
    ctx.addIssue({ code: "custom", message, path: ["birthDate"] });
  }
}

export const newPlayerFormFieldsSchema = z
  .object({
    teamId: z.string().uuid("Selecciona un equipo válido."),
    leagueId: z.string().uuid("Liga no válida."),
    fullName: z.string().trim().min(2, "Captura el nombre del jugador.").max(160),
    birthDate: z.string().trim().min(1, "Captura la fecha de nacimiento del jugador."),
    /** Vacío = sin número. Si trae algo, debe ser entero 0–999. */
    shirtNumber: z.string().trim(),
    /** Texto libre opcional (POR, DEF, MC, DEL, etc.). */
    position: z.string().trim().max(60).optional().default(""),
    /** Vacío = sin WhatsApp. */
    whatsappCountryIso: z.string().min(2).max(2),
    whatsappPhoneNational: z.string().trim(),
    /** Vacío = sin CURP. Si trae texto: 18 caracteres alfanuméricos → `players.doc_id`. */
    docId: z.string().trim().max(24).optional().default(""),
  })
  .superRefine((data, ctx) => {
    addBirthDateFieldIssues(data.birthDate, ctx);

    const curpRaw = data.docId.trim();
    if (curpRaw.length > 0) {
      const normalized = normalizeCurpInput(curpRaw);
      if (!isValidMexicanCurp(normalized)) {
        ctx.addIssue({
          code: "custom",
          message: invalidCurpMessage(),
          path: ["docId"],
        });
      }
    }

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

/** CURP normalizada para `players.doc_id`, o `null` si el campo quedó vacío. */
export function parseOptionalDocIdCurp(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.length) return null;
  return normalizeCurpInput(trimmed);
}
