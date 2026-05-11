-- Auto-maintain updated_at on row changes (matches legacy db/migrations/00001 behavior)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER leagues_set_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER league_members_set_updated_at
  BEFORE UPDATE ON league_members
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER venues_set_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER seasons_set_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER season_teams_set_updated_at
  BEFORE UPDATE ON season_teams
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER sanctions_set_updated_at
  BEFORE UPDATE ON sanctions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint
CREATE TRIGGER sponsor_slots_set_updated_at
  BEFORE UPDATE ON sponsor_slots
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
