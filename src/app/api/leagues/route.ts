import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { newLeagueTextFieldsSchema } from "@/components/dashboard/leagues/new-league-form-schema";
import {
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "@/components/dashboard/leagues/league-shield-constraints";
import { getDb } from "@/db/client";
import { leagueCategories } from "@/db/schema";
import { AppAuditEntityType, recordAppAuditLog } from "@/logic/audit";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import {
  createLeagueWithIdempotency,
  type CreatedLeagueSummary,
  type NewLeagueCategoryInput,
} from "@/logic/leagues/create-league-with-idempotency";
import { deleteLeagueById } from "@/logic/leagues/delete-league-by-id";
import { findCategoryPresetByCode } from "@/logic/leagues/league-category-presets";
import {
  leagueShieldStorageBucket,
  uploadLeagueShieldAndMergeBranding,
} from "@/logic/leagues/upload-league-shield";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Decodifica `categories` del FormData (JSON array de `{ code }` o equivalente preset).
 * Aceptamos también un string CSV separado por comas para clientes simples.
 */
function readInitialCategories(form: FormData): NewLeagueCategoryInput[] {
  const raw = form.get("categories");
  if (raw == null) return [];

  const candidates: string[] = [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.length) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            if (typeof entry === "string") {
              candidates.push(entry);
            } else if (entry && typeof entry === "object") {
              const code = (entry as { code?: unknown }).code;
              if (typeof code === "string") candidates.push(code);
            }
          }
        }
      } catch {
        return [];
      }
    } else {
      for (const piece of trimmed.split(",")) {
        candidates.push(piece);
      }
    }
  }

  const seen = new Set<string>();
  const out: NewLeagueCategoryInput[] = [];
  for (const c of candidates) {
    const code = c.trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    const preset = findCategoryPresetByCode(code);
    if (!preset) continue;
    seen.add(code);
    out.push({
      code: preset.code,
      name: preset.name,
      gender: preset.gender,
      ageMin: preset.ageMin,
      ageMax: preset.ageMax,
    });
  }
  return out;
}

function readIdempotencyKey(request: Request): string | null {
  const raw =
    request.headers.get("idempotency-key") ?? request.headers.get("Idempotency-Key");
  if (!raw) return null;
  const key = raw.trim();
  if (key.length < 8 || key.length > 200) return null;
  return key;
}

function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

async function recordLeagueCreateAudit(
  appUserId: string,
  league: CreatedLeagueSummary,
  initialCategoryCount: number,
  shieldUploaded: boolean,
): Promise<void> {
  await recordAppAuditLog(
    {
      actorUserId: appUserId,
      action: "create",
      entityType: AppAuditEntityType.league,
      entityId: league.id,
      leagueId: league.id,
      summary: `Liga creada: ${league.name}`,
      metadata: {
        slug: league.slug,
        initialCategoryCount,
        shieldUploaded,
      },
    },
    { swallowErrors: true },
  );

  if (initialCategoryCount === 0) return;

  const db = getDb();
  const categories = await db
    .select({
      id: leagueCategories.id,
      name: leagueCategories.name,
      code: leagueCategories.code,
    })
    .from(leagueCategories)
    .where(eq(leagueCategories.leagueId, league.id));

  for (const category of categories) {
    await recordAppAuditLog(
      {
        actorUserId: appUserId,
        action: "create",
        entityType: AppAuditEntityType.leagueCategory,
        entityId: category.id,
        leagueId: league.id,
        summary: `Categoría creada: ${category.name}`,
        metadata: { code: category.code, source: "league_create" },
      },
      { swallowErrors: true },
    );
  }
}

/**
 * POST — crear liga (multipart). Header `Idempotency-Key` obligatorio.
 * Campo de archivo opcional: `shield` (JPG/PNG/WebP).
 */
export async function POST(request: Request) {
  try {
    const idempotencyKey = readIdempotencyKey(request);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Enviá un header Idempotency-Key (8–200 caracteres)." },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appUser = await syncAppUserFromSupabaseAuthUser(user);
    const form = await request.formData();

    const parsedFields = newLeagueTextFieldsSchema.safeParse({
      leagueName: readFormString(form, "leagueName"),
      contactName: readFormString(form, "contactName"),
      contactCountryIso: readFormString(form, "contactCountryIso"),
      contactPhoneNational: readFormString(form, "contactPhoneNational"),
      contactEmail: readFormString(form, "contactEmail"),
      organizationAddress: readFormString(form, "organizationAddress"),
    });

    if (!parsedFields.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsedFields.error.issues) {
        const seg = issue.path[0];
        if (typeof seg === "string" && errors[seg] === undefined) {
          errors[seg] = issue.message;
        }
      }
      return NextResponse.json({ error: "Validación", fields: errors }, { status: 400 });
    }

    const shieldEntry = form.get("shield");
    let shieldBytes: Uint8Array | null = null;
    let shieldContentType: string | null = null;

    if (shieldEntry instanceof File && shieldEntry.size > 0) {
      if (shieldEntry.size > LEAGUE_SHIELD_MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "El escudo supera el tamaño máximo permitido." },
          { status: 400 },
        );
      }
      const ct = shieldEntry.type;
      if (!LEAGUE_SHIELD_MIME_TYPES.has(ct)) {
        return NextResponse.json(
          { error: "El escudo debe ser JPG, PNG o WebP." },
          { status: 400 },
        );
      }
      shieldBytes = new Uint8Array(await shieldEntry.arrayBuffer());
      shieldContentType = ct;
    }

    const initialCategories = readInitialCategories(form);

    const { replay, league } = await createLeagueWithIdempotency(
      appUser.id,
      idempotencyKey,
      parsedFields.data,
      initialCategories,
    );

    const bucket = leagueShieldStorageBucket();
    const service = createServiceRoleClient();
    const storageClient = service ?? supabase;

    if (!replay && shieldBytes && shieldContentType) {
      try {
        await uploadLeagueShieldAndMergeBranding(storageClient, {
          bucket,
          ownerUserId: appUser.id,
          leagueId: league.id,
          bytes: shieldBytes,
          contentType: shieldContentType,
        });
      } catch (e) {
        console.error("[POST /api/leagues] shield upload", e);
        try {
          await deleteLeagueById(league.id);
        } catch (rollbackErr) {
          console.error("[POST /api/leagues] rollback league after shield failure", rollbackErr);
        }
        return NextResponse.json(
          {
            error:
              "No se pudo guardar el escudo en Storage. La liga no se guardó. Revisa políticas del bucket, que exista SUPABASE_STORAGE_BUCKET, o define SUPABASE_SERVICE_ROLE_KEY en el servidor.",
          },
          { status: 503 },
        );
      }
    }

    if (!replay) {
      await recordLeagueCreateAudit(
        appUser.id,
        league,
        initialCategories.length,
        Boolean(shieldBytes && shieldContentType),
      );
    }

    return NextResponse.json(
      { league, replay },
      { status: replay ? 200 : 201 },
    );
  } catch (e) {
    console.error("[POST /api/leagues]", e);
    return NextResponse.json({ error: "No se pudo crear la liga" }, { status: 500 });
  }
}
