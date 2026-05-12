import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { NewLeagueTextFields } from "@/components/dashboard/leagues/new-league-form-schema";
import { getDb } from "@/db/client";
import {
  leagueCategories,
  leagueCreateIdempotency,
  leagueMembers,
  leagues,
} from "@/db/schema";
import { combineCountryDialAndNationalToE164 } from "@/logic/access-request/whatsapp";
import type { LeagueCategoryGender } from "@/logic/leagues/league-category-presets";
import { findDialOptionByIso2 } from "@/lib/phone/country-dial-options";

export type CreatedLeagueSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type NewLeagueCategoryInput = {
  code: string;
  name: string;
  gender: LeagueCategoryGender;
  ageMin: number | null;
  ageMax: number | null;
};

function advisoryLockKeyPair(scope: string): [number, number] {
  const buf = createHash("sha256").update(scope, "utf8").digest();
  return [buf.readInt32BE(0), buf.readInt32BE(4)];
}

function slugFromLeagueName(leagueName: string): string {
  const base = leagueName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "liga";
  return `${base}-${randomBytes(4).toString("hex")}`;
}

function contactWhatsAppE164(data: NewLeagueTextFields): string {
  const national = data.contactPhoneNational.replace(/\D/g, "");
  const country = findDialOptionByIso2(data.contactCountryIso);
  if (!country) {
    throw new Error("País de teléfono no válido");
  }
  return combineCountryDialAndNationalToE164(country.dialDigits, national);
}

function leagueSettingsJson(data: NewLeagueTextFields) {
  return {
    contact: {
      fullName: data.contactName.trim(),
      email: data.contactEmail.trim().toLowerCase(),
      whatsappE164: contactWhatsAppE164(data),
      organizationAddress: data.organizationAddress.trim(),
      whatsappCountryIso2: data.contactCountryIso.toUpperCase(),
    },
  };
}

function normalizeCategoryInputs(
  inputs: readonly NewLeagueCategoryInput[] | undefined,
): NewLeagueCategoryInput[] {
  if (!inputs?.length) return [];
  const seen = new Set<string>();
  const out: NewLeagueCategoryInput[] = [];
  for (const c of inputs) {
    const code = c.code.trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      name: c.name.trim() || code,
      gender: c.gender,
      ageMin: c.ageMin,
      ageMax: c.ageMax,
    });
  }
  return out;
}

/**
 * Crea liga + fila `owner` en `league_members` y registra idempotencia en una transacción.
 * Opcionalmente crea categorías iniciales en `league_categories`.
 * Reintentos con la misma clave devuelven la misma liga (`replay: true`) sin volver a
 * insertar categorías.
 */
export async function createLeagueWithIdempotency(
  appUserId: string,
  idempotencyKey: string,
  fields: NewLeagueTextFields,
  initialCategories?: readonly NewLeagueCategoryInput[],
): Promise<{ replay: boolean; league: CreatedLeagueSummary }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [k1, k2] = advisoryLockKeyPair(`league_create:${appUserId}:${idempotencyKey}`);
    await tx.execute(sql`select pg_advisory_xact_lock(${k1}::int, ${k2}::int)`);

    const existing = await tx
      .select({ leagueId: leagueCreateIdempotency.leagueId })
      .from(leagueCreateIdempotency)
      .where(
        and(
          eq(leagueCreateIdempotency.userId, appUserId),
          eq(leagueCreateIdempotency.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const row = await tx
        .select({
          id: leagues.id,
          name: leagues.name,
          slug: leagues.slug,
          status: leagues.status,
        })
        .from(leagues)
        .where(eq(leagues.id, existing[0].leagueId))
        .limit(1);

      if (!row[0]) {
        throw new Error("Inconsistencia: idempotencia sin liga asociada");
      }

      return { replay: true, league: row[0] };
    }

    const slug = slugFromLeagueName(fields.leagueName);
    const settings = leagueSettingsJson(fields);

    const [league] = await tx
      .insert(leagues)
      .values({
        ownerUserId: appUserId,
        slug,
        name: fields.leagueName.trim(),
        countryCode: fields.contactCountryIso.toUpperCase(),
        settings,
        branding: {},
      })
      .returning({
        id: leagues.id,
        name: leagues.name,
        slug: leagues.slug,
        status: leagues.status,
      });

    if (!league) {
      throw new Error("No se pudo crear la liga");
    }

    await tx.insert(leagueMembers).values({
      leagueId: league.id,
      userId: appUserId,
      role: "owner",
      acceptedAt: new Date(),
    });

    const categories = normalizeCategoryInputs(initialCategories);
    if (categories.length > 0) {
      await tx.insert(leagueCategories).values(
        categories.map((c, index) => ({
          leagueId: league.id,
          code: c.code,
          name: c.name,
          gender: c.gender,
          ageMin: c.ageMin,
          ageMax: c.ageMax,
          sortOrder: index,
        })),
      );
    }

    await tx.insert(leagueCreateIdempotency).values({
      userId: appUserId,
      idempotencyKey,
      leagueId: league.id,
    });

    return { replay: false, league };
  });
}
