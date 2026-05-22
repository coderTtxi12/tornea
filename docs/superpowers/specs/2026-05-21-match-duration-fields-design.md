# Partido: duración por tiempos (obligatorio)

## Requisito
En **Nuevo partido** / editar partido, capturar obligatoriamente:
- Minutos primer tiempo
- Minutos medio tiempo (descanso)
- Minutos segundo tiempo

## Almacenamiento
- `matches.report`: `firstHalfMinutes`, `halftimeBreakMinutes`, `secondHalfMinutes` (enteros).
- `matches.regulation_minutes`: `firstHalfMinutes + secondHalfMinutes` (tiempo reglamentario en cancha, sin descanso).

## Validación API
Enteros 1–120 por tiempo; descanso 0–60.

## UI (Tornea dashboard)
- `fieldset` «Duración del partido» con grid 3 columnas en `sm+`.
- Campos `required`, etiquetas claras, asterisco en leyenda.
- Valores por defecto al crear: 45 / 15 / 45.
- Al editar: leer de `report`; si faltan (partidos viejos), mismo default.

## Fuera de alcance
- No modificar categorías ni plantillas de liga.
