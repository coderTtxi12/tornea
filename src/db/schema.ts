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

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firebaseUid: text("firebase_uid").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    phone: text("phone"),
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
    status: matchStatusEnum("status").notNull().default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
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
    minute: integer("minute"),
    isOwnGoal: boolean("is_own_goal").notNull().default(false),
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
}));

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
