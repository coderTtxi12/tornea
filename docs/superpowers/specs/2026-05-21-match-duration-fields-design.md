# Match: duration by halves (required)

## Requirement
On **New match** / edit match, require:
- First-half minutes
- Halftime break minutes
- Second-half minutes

## Storage
- `matches.report`: `firstHalfMinutes`, `halftimeBreakMinutes`, `secondHalfMinutes` (integers).
- `matches.regulation_minutes`: `firstHalfMinutes + secondHalfMinutes` (regulation time on the pitch, excluding the break).

## API validation
Integers 1–120 per half; break 0–60.

## UI (Tornea dashboard)
- `fieldset` “Match duration” with a 3-column grid at `sm+`.
- `required` fields, clear labels, asterisk in the legend.
- Defaults when creating: 45 / 15 / 45.
- When editing: read from `report`; if missing (legacy matches), use the same defaults.

## Out of scope
- Do not change categories or league templates.
