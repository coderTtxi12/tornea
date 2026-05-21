import { z } from "zod";

import { buildOptionalPlayerWhatsappE164 } from "./new-player-form-schema";

export const newLeagueRefereeFormFieldsSchema = z.object({
  leagueId: z.string().uuid("Liga no válida."),
  fullName: z.string().trim().min(2, "Indica el nombre del árbitro.").max(160),
  whatsappCountryIso: z.string().min(2).max(2),
  whatsappPhoneNational: z.string().trim(),
  email: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type NewLeagueRefereeParsed = {
  leagueId: string;
  fullName: string;
  whatsappE164: string;
  email: string | null;
  notes: string | null;
};

export function parseNewLeagueRefereeForm(raw: unknown):
  | { ok: true; data: NewLeagueRefereeParsed }
  | { ok: false; fields: Record<string, string> } {
  const parsed = newLeagueRefereeFormFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && fields[key] === undefined) {
        fields[key] = issue.message;
      }
    }
    return { ok: false, fields };
  }
  const d = parsed.data;
  const e164 = buildOptionalPlayerWhatsappE164(d.whatsappCountryIso, d.whatsappPhoneNational);
  if (!e164) {
    return {
      ok: false,
      fields: { whatsappPhoneNational: "Indica un número de WhatsApp válido." },
    };
  }
  const emailTrim = d.email.trim();
  let email: string | null = null;
  if (emailTrim.length > 0) {
    const em = z.string().email("Correo no válido.").safeParse(emailTrim);
    if (!em.success) {
      return { ok: false, fields: { email: em.error.issues[0]?.message ?? "Correo no válido." } };
    }
    email = em.data;
  }
  return {
    ok: true,
    data: {
      leagueId: d.leagueId,
      fullName: d.fullName.trim(),
      whatsappE164: e164,
      email,
      notes: d.notes?.trim() ? d.notes.trim() : null,
    },
  };
}
