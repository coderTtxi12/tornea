import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (match PostgreSQL type names)
// ---------------------------------------------------------------------------

export const leagueStatusEnum = pgEnum("league_status", [
  "draft",
  "active",
  "archived",
]);

export const leagueBillingStatusEnum = pgEnum("league_billing_status", [
  "trial",
  "active",
  "past_due",
  "cancelled",
]);

export const leagueMemberRoleEnum = pgEnum("league_member_role", [
  "owner",
  "admin",
  "staff",
  "referee",
  "team_staff",
  "viewer",
]);

/** Género asociado a una categoría de liga (varonil/femenil/mixto/no especificado). */
export const leagueCategoryGenderEnum = pgEnum("league_category_gender", [
  "male",
  "female",
  "mixed",
  "unspecified",
]);

export const seasonStatusEnum = pgEnum("season_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const seasonFormatEnum = pgEnum("season_format", [
  "round_robin",
  "groups",
  "knockout",
  "mixed",
]);

export const teamStatusEnum = pgEnum("team_status", [
  "active",
  "inactive",
  "withdrawn",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
  "walkover",
]);

export const sanctionKindEnum = pgEnum("sanction_kind", [
  "suspension",
  "fine",
  "warning",
  "ban",
]);

export const sanctionStatusEnum = pgEnum("sanction_status", [
  "active",
  "served",
  "appealed",
  "revoked",
]);

/** In-game goal classification (football-first; other sports can add values later). */
export const footballGoalKindEnum = pgEnum("football_goal_kind", [
  "open_play",
  "penalty_kick",
  "direct_free_kick",
  "indirect_free_kick",
  "corner",
  "header",
  "other",
]);

export const footballCardKindEnum = pgEnum("football_card_kind", [
  "yellow",
  "red",
  "second_yellow",
]);

export const footballPeriodEnum = pgEnum("football_period", [
  "first_half",
  "second_half",
  "extra_first",
  "extra_second",
  "penalty_shootout",
]);

/** Result of a penalty kick taken during open play / extra time (not shootout rounds). */
export const footballPenaltyAttemptOutcomeEnum = pgEnum(
  "football_penalty_attempt_outcome",
  ["scored", "saved", "missed", "off_target", "disallowed"],
);

export const lineupSlotEnum = pgEnum("lineup_slot", ["starter", "bench"]);

export const matchReportKindEnum = pgEnum("match_report_kind", [
  "delegate",
  "referee",
  "press",
  "internal",
]);

/** Faltas / conducta en juego (p. ej. patada, entrada peligrosa). Distinto de la tarjeta en sí. */
export const footballFoulKindEnum = pgEnum("football_foul_kind", [
  "violent_conduct",
  "serious_foul_play",
  "reckless_tackle",
  "careless_foul",
  "dissent",
  "unsporting_behavior",
  "handball",
  "offside",
  "simulation",
  "other",
]);


// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(), // Supabase auth.users.id
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    phone: text("phone"),
    /** When set, the user may open the product dashboard (invite-only). */
    dashboardAccessGrantedAt: timestamp("dashboard_access_granted_at", {
      withTimezone: true,
    }),
    locale: text("locale").notNull().default("es"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

/**
 * Lead / waitlist submissions from users without dashboard access.
 * Reviewed by Tornea operators before granting {@link users.dashboardAccessGrantedAt}.
 */
export const dashboardAccessRequests = pgTable(
  "dashboard_access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactFullName: text("contact_full_name").notNull(),
    /** WhatsApp or mobile, ideally E.164 (e.g. +52…). */
    whatsappNumber: text("whatsapp_number").notNull(),
    leaguesManagedCount: integer("leagues_managed_count").notNull(),
    tournamentsSummary: text("tournaments_summary").notNull(),
    organizationName: text("organization_name"),
    cityOrRegion: text("city_or_region"),
    referralSource: text("referral_source"),
    /** Estimated active players / athletes (optional sizing hint). */
    approximatePlayersCount: integer("approximate_players_count"),
    extraNotes: text("extra_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("dashboard_access_requests_user_id_idx").on(t.userId),
    index("dashboard_access_requests_created_at_idx").on(t.createdAt),
  ],
);

export const leagues = pgTable(
  "leagues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sportCode: text("sport_code").notNull().default("football"),
    countryCode: text("country_code"),
    timezone: text("timezone").notNull().default("America/Guayaquil"),
    status: leagueStatusEnum("status").notNull().default("draft"),
    billingStatus: leagueBillingStatusEnum("billing_status")
      .notNull()
      .default("trial"),
    branding: jsonb("branding").notNull().default({}),
    rules: jsonb("rules").notNull().default({}),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("leagues_slug_lower_idx").on(sql`lower(${t.slug})`),
    index("leagues_owner_user_id_idx").on(t.ownerUserId),
    index("leagues_status_idx").on(t.status),
  ],
);

export const leagueMembers = pgTable(
  "league_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: leagueMemberRoleEnum("role").notNull().default("viewer"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("league_members_league_user_unique").on(t.leagueId, t.userId),
    index("league_members_league_id_idx").on(t.leagueId),
    index("league_members_user_id_idx").on(t.userId),
  ],
);

/**
 * Categorías de competencia dentro de una liga (p. ej. Varonil, Femenil, Sub-15).
 * Una categoría existe a nivel de liga y se referencia desde `season_teams` y `matches`.
 */
export const leagueCategories = pgTable(
  "league_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    gender: leagueCategoryGenderEnum("gender").notNull().default("unspecified"),
    ageMin: integer("age_min"),
    ageMax: integer("age_max"),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("league_categories_league_code_lower_idx").on(
      t.leagueId,
      sql`lower(${t.code})`,
    ),
    index("league_categories_league_id_idx").on(t.leagueId),
  ],
);

/**
 * Dedup de creación de liga por usuario + Idempotency-Key (header de request).
 * Evita duplicar `leagues` ante doble envío o reintentos de red.
 */
export const leagueCreateIdempotency = pgTable(
  "league_create_idempotency",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.idempotencyKey] }),
    index("league_create_idempotency_league_id_idx").on(t.leagueId),
  ],
);

/**
 * Dedup de creación de categoría (`league_categories`) por usuario + Idempotency-Key.
 */
export const leagueCategoryCreateIdempotency = pgTable(
  "league_category_create_idempotency",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    leagueCategoryId: uuid("league_category_id")
      .notNull()
      .references(() => leagueCategories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.idempotencyKey] }),
    index("league_category_create_idempotency_category_id_idx").on(t.leagueCategoryId),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("venues_league_id_idx").on(t.leagueId)],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    format: seasonFormatEnum("format").notNull().default("round_robin"),
    status: seasonStatusEnum("status").notNull().default("scheduled"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    formatConfig: jsonb("format_config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("seasons_league_slug_lower_idx").on(
      t.leagueId,
      sql`lower(${t.slug})`,
    ),
    index("seasons_league_id_idx").on(t.leagueId),
    index("seasons_status_idx").on(t.status),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortName: text("short_name"),
    crestUrl: text("crest_url"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    status: teamStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("teams_league_name_lower_idx").on(
      t.leagueId,
      sql`lower(${t.name})`,
    ),
    index("teams_league_id_idx").on(t.leagueId),
  ],
);

export const seasonTeams = pgTable(
  "season_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    leagueCategoryId: uuid("league_category_id").references(
      () => leagueCategories.id,
      { onDelete: "set null" },
    ),
    division: text("division"),
    seed: integer("seed"),
    points: integer("points").notNull().default(0),
    played: integer("played").notNull().default(0),
    won: integer("won").notNull().default(0),
    drawn: integer("drawn").notNull().default(0),
    lost: integer("lost").notNull().default(0),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    position: integer("position"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("season_teams_season_team_unique").on(t.seasonId, t.teamId),
    index("season_teams_season_id_idx").on(t.seasonId),
    index("season_teams_team_id_idx").on(t.teamId),
    index("season_teams_league_category_id_idx").on(t.leagueCategoryId),
  ],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fullName: text("full_name").notNull(),
    docId: text("doc_id"),
    birthDate: date("birth_date"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("players_league_id_idx").on(t.leagueId),
    index("players_user_id_idx").on(t.userId),
  ],
);

export const teamRosters = pgTable(
  "team_rosters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    shirtNumber: integer("shirt_number"),
    position: text("position"),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("team_rosters_season_team_player_unique").on(
      t.seasonId,
      t.teamId,
      t.playerId,
    ),
    index("team_rosters_season_id_idx").on(t.seasonId),
    index("team_rosters_team_id_idx").on(t.teamId),
    index("team_rosters_player_id_idx").on(t.playerId),
  ],
);

export const teamStaffLinks = pgTable(
  "team_staff_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonTeamId: uuid("season_team_id")
      .notNull()
      .references(() => seasonTeams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("team_staff_links_season_team_user_unique").on(
      t.seasonTeamId,
      t.userId,
    ),
    index("team_staff_links_user_id_idx").on(t.userId),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    leagueCategoryId: uuid("league_category_id").references(
      () => leagueCategories.id,
      { onDelete: "set null" },
    ),
    matchday: integer("matchday"),
    roundLabel: text("round_label"),
    venueId: uuid("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("America/Guayaquil"),
    homeTeamId: uuid("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    awayTeamId: uuid("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    sportCode: text("sport_code").notNull().default("football"),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    /** Reloj real: salida del balón / fin del partido (opcional). */
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** Duración reglamentaria acordada (p. ej. 90 en fútbol 11). */
    regulationMinutes: integer("regulation_minutes").default(90),
    attendance: integer("attendance"),
    notes: text("notes"),
    report: jsonb("report").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "matches_distinct_teams",
      sql`${t.homeTeamId} <> ${t.awayTeamId}`,
    ),
    index("matches_season_id_idx").on(t.seasonId),
    index("matches_scheduled_at_idx").on(t.scheduledAt),
    index("matches_venue_id_idx").on(t.venueId),
    index("matches_home_team_id_idx").on(t.homeTeamId),
    index("matches_away_team_id_idx").on(t.awayTeamId),
    index("matches_league_category_id_idx").on(t.leagueCategoryId),
  ],
);

export const matchGoals = pgTable(
  "match_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    scorerPlayerId: uuid("scorer_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    assistPlayerId: uuid("assist_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    sportCode: text("sport_code").notNull().default("football"),
    goalKind: footballGoalKindEnum("goal_kind"),
    period: footballPeriodEnum("period"),
    minute: integer("minute"),
    stoppageMinute: integer("stoppage_minute"),
    isOwnGoal: boolean("is_own_goal").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("match_goals_match_id_idx").on(t.matchId)],
);

export const matchOfficials = pgTable(
  "match_officials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("referee"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("match_officials_match_user_role_unique").on(
      t.matchId,
      t.userId,
      t.role,
    ),
    index("match_officials_match_id_idx").on(t.matchId),
    index("match_officials_user_id_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Football-first match detail (extensible via sport_code + metadata elsewhere)
// ---------------------------------------------------------------------------

/** Titular / suplente por partido (snapshot; puede diferir del roster de temporada). */
export const matchLineups = pgTable(
  "match_lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    sportCode: text("sport_code").notNull().default("football"),
    slot: lineupSlotEnum("slot").notNull(),
    /** Ej. GK, CB, ST — libre para i18n / otros deportes. */
    positionCode: text("position_code"),
    shirtNumber: integer("shirt_number"),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("match_lineups_match_team_player_unique").on(
      t.matchId,
      t.teamId,
      t.playerId,
    ),
    index("match_lineups_match_id_idx").on(t.matchId),
    index("match_lineups_team_id_idx").on(t.teamId),
  ],
);

export const matchCards = pgTable(
  "match_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    sportCode: text("sport_code").notNull().default("football"),
    cardKind: footballCardKindEnum("card_kind").notNull(),
    period: footballPeriodEnum("period"),
    minute: integer("minute"),
    stoppageMinute: integer("stoppage_minute"),
    reason: text("reason"),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("match_cards_match_id_idx").on(t.matchId),
    index("match_cards_team_id_idx").on(t.teamId),
    index("match_cards_player_id_idx").on(t.playerId),
  ],
);

export const matchSubstitutions = pgTable(
  "match_substitutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerOutId: uuid("player_out_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    playerInId: uuid("player_in_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    sportCode: text("sport_code").notNull().default("football"),
    period: footballPeriodEnum("period"),
    minute: integer("minute"),
    stoppageMinute: integer("stoppage_minute"),
    reason: text("reason"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "match_substitutions_distinct_players",
      sql`${t.playerOutId} <> ${t.playerInId}`,
    ),
    index("match_substitutions_match_id_idx").on(t.matchId),
    index("match_substitutions_team_id_idx").on(t.teamId),
  ],
);

/** Penal máximo reglamentario (no la tanda de penales). Si convirtió, enlazar `matchGoalId`. */
export const matchPenaltyAttempts = pgTable(
  "match_penalty_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    takerId: uuid("taker_id").references(() => players.id, {
      onDelete: "set null",
    }),
    goalkeeperId: uuid("goalkeeper_id").references(() => players.id, {
      onDelete: "set null",
    }),
    sportCode: text("sport_code").notNull().default("football"),
    outcome: footballPenaltyAttemptOutcomeEnum("outcome").notNull(),
    period: footballPeriodEnum("period"),
    minute: integer("minute"),
    stoppageMinute: integer("stoppage_minute"),
    matchGoalId: uuid("match_goal_id").references(() => matchGoals.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("match_penalty_attempts_match_id_idx").on(t.matchId),
    index("match_penalty_attempts_team_id_idx").on(t.teamId),
  ],
);

/** Tanda de penales (ej. copas). */
export const penaltyShootouts = pgTable(
  "penalty_shootouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    sportCode: text("sport_code").notNull().default("football"),
    /** Marcador final de la tanda (opcional; se puede calcular desde kicks). */
    homeHits: integer("home_hits").notNull().default(0),
    awayHits: integer("away_hits").notNull().default(0),
    winnerTeamId: uuid("winner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("penalty_shootouts_match_unique").on(t.matchId),
    index("penalty_shootouts_match_id_idx").on(t.matchId),
  ],
);

export const penaltyShootoutKicks = pgTable(
  "penalty_shootout_kicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shootoutId: uuid("shootout_id")
      .notNull()
      .references(() => penaltyShootouts.id, { onDelete: "cascade" }),
    sequenceIndex: integer("sequence_index").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    takerId: uuid("taker_id").references(() => players.id, {
      onDelete: "set null",
    }),
    goalkeeperId: uuid("goalkeeper_id").references(() => players.id, {
      onDelete: "set null",
    }),
    sportCode: text("sport_code").notNull().default("football"),
    scored: boolean("scored").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("penalty_shootout_kicks_order_unique").on(
      t.shootoutId,
      t.sequenceIndex,
    ),
    index("penalty_shootout_kicks_shootout_id_idx").on(t.shootoutId),
  ],
);

/** Actas / informes de partido (texto libre + metadatos). */
export const matchReportSubmissions = pgTable(
  "match_report_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: matchReportKindEnum("kind").notNull().default("internal"),
    title: text("title"),
    body: text("body"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("match_report_submissions_match_id_idx").on(t.matchId)],
);

/**
 * Eventos genéricos por deporte (VAR, lesión, interrupción, etc.) sin tablas dedicadas aún.
 * `event_key` convención: football.var_review, basketball.timeout...
 */
export const sportMatchEvents = pgTable(
  "sport_match_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    sportCode: text("sport_code").notNull().default("football"),
    eventKey: text("event_key").notNull(),
    minute: integer("minute"),
    stoppageMinute: integer("stoppage_minute"),
    period: footballPeriodEnum("period"),
    payload: jsonb("payload").notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sport_match_events_match_id_idx").on(t.matchId),
    index("sport_match_events_sport_key_idx").on(t.sportCode, t.eventKey),
  ],
);

export const sanctions = pgTable(
  "sanctions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, {
      onDelete: "set null",
    }),
    playerId: uuid("player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    kind: sanctionKindEnum("kind").notNull(),
    status: sanctionStatusEnum("status").notNull().default("active"),
    title: text("title").notNull(),
    description: text("description"),
    fineAmountCents: integer("fine_amount_cents"),
    currency: text("currency").notNull().default("USD"),
    matchesRemaining: integer("matches_remaining"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sanctions_league_id_idx").on(t.leagueId),
    index("sanctions_player_id_idx").on(t.playerId),
    index("sanctions_team_id_idx").on(t.teamId),
  ],
);

/**
 * Faltas e incidencias (agresiones, patadas, conducta violenta).
 * La tarjeta mostrada en el acta va en `match_cards`; aquí enlazas con `matchCardId` si aplica.
 * La sanción del comité disciplinario de la liga va en `sanctions`; enlaza con `leagueSanctionId` si aplica después del partido.
 */
export const matchFouls = pgTable(
  "match_fouls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    offendingTeamId: uuid("offending_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    offendingPlayerId: uuid("offending_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    victimPlayerId: uuid("victim_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    sportCode: text("sport_code").notNull().default("football"),
    foulKind: footballFoulKindEnum("foul_kind").notNull(),
    period: footballPeriodEnum("period"),
    minute: integer("minute"),
    stoppageMinute: integer("stoppage_minute"),
    description: text("description"),
    advantagePlayed: boolean("advantage_played").notNull().default(false),
    refereeDecision: text("referee_decision"),
    matchCardId: uuid("match_card_id").references(() => matchCards.id, {
      onDelete: "set null",
    }),
    leagueSanctionId: uuid("league_sanction_id").references(() => sanctions.id, {
      onDelete: "set null",
    }),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("match_fouls_match_id_idx").on(t.matchId),
    index("match_fouls_offending_player_id_idx").on(t.offendingPlayerId),
    index("match_fouls_victim_player_id_idx").on(t.victimPlayerId),
    index("match_fouls_league_sanction_id_idx").on(t.leagueSanctionId),
  ],
);

export const sponsorSlots = pgTable(
  "sponsor_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    targetUrl: text("target_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sponsor_slots_league_id_idx").on(t.leagueId)],
);

export const prizeDraws = pgTable(
  "prize_draws",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    drawnAt: timestamp("drawn_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("prize_draws_season_id_idx").on(t.seasonId)],
);

// ---------------------------------------------------------------------------
// Relations (optional; use with drizzle-orm relational queries)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  ownedLeagues: many(leagues),
  leagueMemberships: many(leagueMembers),
  dashboardAccessRequests: many(dashboardAccessRequests),
}));

export const dashboardAccessRequestsRelations = relations(
  dashboardAccessRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [dashboardAccessRequests.userId],
      references: [users.id],
    }),
  }),
);

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  owner: one(users, {
    fields: [leagues.ownerUserId],
    references: [users.id],
  }),
  members: many(leagueMembers),
  venues: many(venues),
  seasons: many(seasons),
  teams: many(teams),
}));

export const leagueMembersRelations = relations(leagueMembers, ({ one }) => ({
  league: one(leagues, {
    fields: [leagueMembers.leagueId],
    references: [leagues.id],
  }),
  user: one(users, {
    fields: [leagueMembers.userId],
    references: [users.id],
  }),
}));
