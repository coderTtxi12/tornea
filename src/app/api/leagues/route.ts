import { NextResponse } from "next/server";

import { newLeagueTextFieldsSchema } from "@/components/dashboard/leagues/new-league-form-schema";
import {
  LEAGUE_SHIELD_MAX_FILE_BYTES,
  LEAGUE_SHIELD_MIME_TYPES,
} from "@/components/dashboard/leagues/league-shield-constraints";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { createLeagueWithIdempotency } from "@/logic/leagues/create-league-with-idempotency";
import { deleteLeagueById } from "@/logic/leagues/delete-league-by-id";
import {
  leagueShieldStorageBucket,
  uploadLeagueShieldAndMergeBranding,
} from "@/logic/leagues/upload-league-shield";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

    const { replay, league } = await createLeagueWithIdempotency(
      appUser.id,
      idempotencyKey,
      parsedFields.data,
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

    return NextResponse.json(
      { league, replay },
      { status: replay ? 200 : 201 },
    );
  } catch (e) {
    console.error("[POST /api/leagues]", e);
    return NextResponse.json({ error: "No se pudo crear la liga" }, { status: 500 });
  }
}
