# Duration by halves on category (not on match create)

## Source of truth
`league_categories.metadata`: `firstHalfMinutes`, `halftimeBreakMinutes`, `secondHalfMinutes` — **required** when creating/editing a category, **no default values** in the form.

## Match
- When a category is selected: preload all three values from the category.
- The user may edit them; on save they go to `matches.report` (they do not update the category).
- With no category on the match: do not show or require half durations.

## `regulation_minutes`
`firstHalfMinutes + secondHalfMinutes` when the match has resolved duration (report or category at save time).
