# Duración por tiempos en categoría (no en alta de partido)

## Fuente de verdad
`league_categories.metadata`: `firstHalfMinutes`, `halftimeBreakMinutes`, `secondHalfMinutes` — **obligatorios** al crear/editar categoría, **sin valores por defecto** en el formulario.

## Partido
- Al elegir categoría: precargar los tres valores desde la categoría.
- El usuario puede editarlos; al guardar van a `matches.report` (no actualizan la categoría).
- Sin categoría en el partido: no se muestran ni exigen tiempos.

## `regulation_minutes`
`firstHalfMinutes + secondHalfMinutes` cuando el partido tiene duración resuelta (report o categoría al guardar).
